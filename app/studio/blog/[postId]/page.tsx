import { BlogEditor } from '@/studio/features/blog/BlogEditor';

interface StudioBlogPostPageProps {
  params: { postId: string };
}

export default function StudioBlogPostPage({ params }: StudioBlogPostPageProps) {
  return <BlogEditor isNew={false} postId={params.postId} />;
}
