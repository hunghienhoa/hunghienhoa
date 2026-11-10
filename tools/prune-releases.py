"""Keep only the three newest published portfolio backups; preserve Git tags/history."""
import json,re,subprocess,sys
def obsolete(releases):
    backups=[r for r in releases if not r.get('draft') and not r.get('prerelease') and re.fullmatch(r'web-\d{8}-\d{6}-[a-f0-9]{7}',r['tag_name'])]
    return sorted(backups,key=lambda r:(r['published_at'],r['tag_name']),reverse=True)[3:]
def main():
    if '--check' in sys.argv:
        rows=[dict(tag_name=f'web-20261110-00000{i}-abcdef0',published_at=str(i),draft=False,prerelease=False) for i in range(6)]
        assert [r['published_at'] for r in obsolete(rows)]==['2','1','0']
        assert obsolete(rows[:3])==[]
        assert obsolete([dict(tag_name='unrelated',published_at='9')])==[]
        assert obsolete([{**r,'draft':True} for r in rows])==[]
        print('PASS: newest three retained; drafts and unrelated releases untouched.')
        return
    result=subprocess.check_output(['gh','api','--paginate','--slurp','repos/hunghienhoa/hunghienhoa/releases?per_page=100'])
    releases=[r for page in json.loads(result) for r in page]
    for release in obsolete(releases):
        print('Remove old backup:',release['tag_name'],flush=True)
        if '--apply' in sys.argv:subprocess.run(['gh','release','delete',release['tag_name'],'--repo','hunghienhoa/hunghienhoa','--yes'],check=True)
    if '--apply' not in sys.argv:print('Preview only; pass --apply to keep newest three backups.')
if __name__=='__main__':main()
