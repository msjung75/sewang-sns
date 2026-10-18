import unittest
from archive_publications import merge_archive
class ArchiveTests(unittest.TestCase):
 def post(self,identity='1',**extra):return dict(platform='instagram',post_id=identity,url='https://www.instagram.com/p/'+identity+'/',title_or_caption='공개 캡션',date='2026-10-14',category='시장트렌드',tags=[],fetched_at='2026-10-18T00:00:00Z',**extra)
 def test_archive_preserves_history_when_latest_collection_is_empty(self):
  old=merge_archive({},dict(posts=[self.post()],fetched_at='2026-10-18T00:00:00Z'))
  self.assertEqual(len(merge_archive(old,dict(posts=[],fetched_at='2026-10-19T00:00:00Z'))['posts']),1)
 def test_updates_public_text_without_copying_tokens_or_mutating_source(self):
  post=self.post(token='DO_NOT_ARCHIVE');source=dict(posts=[post],fetched_at='2026-10-18T00:00:00Z');old=merge_archive({},source)
  self.assertNotIn('token',old['posts'][0]);self.assertIn('token',post)
  newer=dict(post,title_or_caption='수정된 공개 캡션');new=merge_archive(old,dict(posts=[newer],fetched_at='2026-10-19T00:00:00Z'))
  self.assertEqual(len(new['posts']),1);self.assertEqual(new['posts'][0]['title_or_caption'],'수정된 공개 캡션');self.assertEqual(new['posts'][0]['first_seen_at'],old['posts'][0]['first_seen_at'])
 def test_credentials_in_urls_and_draft_platform_are_rejected(self):
  self.assertEqual(merge_archive({},dict(posts=[dict(self.post(),url='https://secret:key@example.com'),dict(self.post(),platform='draft')]))['posts'],[])
if __name__=='__main__':unittest.main()
