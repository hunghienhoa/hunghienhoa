"""Dựng dist/lamnet/models/realesr-general-x4v3.onnx từ trọng số gốc Real-ESRGAN, không cần PyTorch.

Nguồn: https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth (BSD-3-Clause).
Kiến trúc SRVGGNetCompact: 64 kênh, 32 lớp Conv3x3 + PReLU, PixelShuffle x4, cộng ảnh gốc phóng to nearest.

Chạy (cần numpy, onnx, onnxruntime):
  python tools/build-lamnet-model.py đường/dẫn/realesr-general-x4v3.pth
Script tự đối chiếu ONNX với bản tính numpy trên ảnh ngẫu nhiên nhỏ; lệch quá 1e-4 thì dừng.
"""
import collections
import pickle
import sys
import zipfile
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

OUT = Path(__file__).resolve().parent.parent / 'dist' / 'lamnet' / 'models' / 'realesr-general-x4v3.onnx'
FEAT, CONVS, SCALE = 64, 32, 4


def load_state(path):
    """Đọc state_dict từ file torch.save (zip + pickle) bằng numpy."""
    archive = zipfile.ZipFile(path)
    prefix = archive.namelist()[0].split('/')[0]
    dtypes = {'FloatStorage': np.float32, 'HalfStorage': np.float16, 'DoubleStorage': np.float64, 'LongStorage': np.int64}

    def rebuild(storage, offset, size, stride, *_):
        flat = storage[offset:]
        return np.lib.stride_tricks.as_strided(flat, shape=tuple(size), strides=[s * flat.itemsize for s in stride]).copy()

    class Unpickler(pickle.Unpickler):
        def find_class(self, module, name):
            if module == 'torch._utils' and name == '_rebuild_tensor_v2':
                return rebuild
            if module == 'torch' and name in dtypes:
                return name
            if module == 'collections' and name == 'OrderedDict':
                return collections.OrderedDict
            raise pickle.UnpicklingError(f'Không cho phép nạp {module}.{name}')

        def persistent_load(self, pid):
            _, storage_type, key, _, _ = pid
            return np.frombuffer(archive.read(f'{prefix}/data/{key}'), dtype=dtypes[storage_type])

    state = Unpickler(archive.open(f'{prefix}/data.pkl')).load()
    return state.get('params_ema') or state.get('params') or state


def build_model(state):
    nodes, inits = [], []
    x = 'input'
    count = 2 + 2 * CONVS + 1
    for i in range(count):
        if f'body.{i}.bias' in state:
            w, b = state[f'body.{i}.weight'].astype(np.float32), state[f'body.{i}.bias'].astype(np.float32)
            inits += [numpy_helper.from_array(w, f'w{i}'), numpy_helper.from_array(b, f'b{i}')]
            nodes.append(helper.make_node('Conv', [x, f'w{i}', f'b{i}'], [f'c{i}'], kernel_shape=[3, 3], pads=[1, 1, 1, 1]))
            x = f'c{i}'
        else:
            # PReLU viết bằng Greater/Mul/Where: ONNX Runtime Web 1.22 không có PRelu trên WebGPU,
            # để nguyên thì mỗi lớp bị đẩy về CPU và chép dữ liệu qua lại giữa GPU và CPU.
            slope = state[f'body.{i}.weight'].astype(np.float32).reshape(-1, 1, 1)
            inits.append(numpy_helper.from_array(slope, f's{i}'))
            nodes += [helper.make_node('Greater', [x, 'zero'], [f'g{i}']),
                      helper.make_node('Mul', [x, f's{i}'], [f'm{i}']),
                      helper.make_node('Where', [f'g{i}', x, f'm{i}'], [f'p{i}'])]
            x = f'p{i}'
    inits.append(numpy_helper.from_array(np.array(0, np.float32), 'zero'))
    nodes.append(helper.make_node('DepthToSpace', [x], ['shuffled'], blocksize=SCALE, mode='CRD'))
    inits.append(numpy_helper.from_array(np.array([1, 1, SCALE, SCALE], np.float32), 'scales'))
    nodes.append(helper.make_node('Resize', ['input', '', 'scales'], ['base'], mode='nearest', coordinate_transformation_mode='asymmetric', nearest_mode='floor'))
    nodes.append(helper.make_node('Add', ['shuffled', 'base'], ['output']))
    graph = helper.make_graph(nodes, 'realesr-general-x4v3',
                              [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1, 3, 'h', 'w'])],
                              [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1, 3, 'H', 'W'])], inits)
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid('', 17)], producer_name='hunghienhoa-lamnet')
    model.ir_version = 8
    onnx.checker.check_model(model)
    return model


def reference(state, x):
    """Lượt chạy numpy thuần để đối chiếu (chậm, chỉ dùng cho ảnh nhỏ)."""
    def conv(t, w, b):
        _, c, h, wd = t.shape
        p = np.pad(t, ((0, 0), (0, 0), (1, 1), (1, 1)))
        cols = np.stack([p[:, :, i:i + h, j:j + wd] for i in range(3) for j in range(3)], axis=2)  # n,c,9,h,w
        return np.einsum('ocq,ncqhw->nohw', w.reshape(w.shape[0], c, 9), cols) + b[None, :, None, None]
    t = x
    for i in range(2 + 2 * CONVS + 1):
        if f'body.{i}.bias' in state:
            t = conv(t, state[f'body.{i}.weight'], state[f'body.{i}.bias'])
        else:
            a = state[f'body.{i}.weight'][None, :, None, None]
            t = np.where(t >= 0, t, a * t)
    n, c, h, w = t.shape
    r = SCALE
    t = t.reshape(n, c // (r * r), r, r, h, w).transpose(0, 1, 4, 2, 5, 3).reshape(n, c // (r * r), h * r, w * r)
    return t + x.repeat(r, axis=2).repeat(r, axis=3)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    import onnxruntime as ort
    state = load_state(sys.argv[1])
    model = build_model(state)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    onnx.save(model, OUT)
    x = np.random.default_rng(7).random((1, 3, 10, 13), dtype=np.float32)
    got = ort.InferenceSession(str(OUT), providers=['CPUExecutionProvider']).run(None, {'input': x})[0]
    want = reference(state, x)
    diff = float(np.abs(got - want).max())
    assert got.shape == (1, 3, 40, 52), got.shape
    assert diff < 1e-4, f'ONNX lệch bản numpy: {diff}'
    print(f'Đã ghi {OUT} ({OUT.stat().st_size} byte); lệch tối đa so với numpy: {diff:.2e}')


if __name__ == '__main__':
    main()
