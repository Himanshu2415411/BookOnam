import { redirect } from 'next/navigation';
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Mic, MicOff } from 'lucide-react';
import Link from 'next/link';
import { getBookBySlugForUser } from '@/lib/actions/book.actions';
import Book from './../../../../database/models/book.model';
import VapiControls from '@/components/VapiControls';
import { IBook } from '@/types';

export default async function BookDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  // Require auth via Clerk's auth() - need to await it
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  // In Next.js 15+, params is a Promise
  const { slug } = await params;

  // Fetch book from database - enforce ownership by passing clerkId
  const result = await getBookBySlugForUser(slug, userId);

  if (!result.success || !result.data) {
    redirect('/');
  }

  const book = result.data as IBook;

  return (
    <div className="book-page-container">
      {/* Floating Back Button */}
      <Link href="/" className="back-btn-floating">
        <ArrowLeft className="w-5 h-5 text-[#212a3b]" />
      </Link>

        {/* Transcript Area */}
        <VapiControls book = {book}/>
    </div>
  );
}
