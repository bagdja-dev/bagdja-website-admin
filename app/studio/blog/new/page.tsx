import { BlogEditor } from '@/studio/features/blog/BlogEditor';

export default function StudioBlogNewPage() {
  return <BlogEditor isNew={true} postId={null} />;
}
