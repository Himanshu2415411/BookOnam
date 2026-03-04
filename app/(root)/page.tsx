import React from 'react'
import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import HeroSection from '@/components/HeroSection'
import LibrarySearchBar from '@/components/LibrarySearchBar'
import BookCard from '@/components/BookCard'
import { getUserBooks, searchUserBooks } from '@/lib/actions/book.actions'

const page = async ({ searchParams }: { searchParams: Promise<{ q?: string }> }) => {
  // Require authentication
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }
  
  // Get search query from URL params
  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q || '';
  
  // Fetch books based on search query
  const bookResults = searchQuery 
    ? await searchUserBooks(userId, searchQuery)
    : await getUserBooks(userId);
  const books = bookResults.success ? bookResults.data ?? [] : [];

  return (
    <main className='wrapper container'>
      <HeroSection />

      {/* Search and Header Section */}
      <div className="library-header-section">
        <h2 className="library-section-title">Your Books</h2>
        <LibrarySearchBar />
      </div>

      {/* Books Grid */}
      <div className="library-books-grid">
        {books.length > 0 ? (
          books.map((book)=> (
            <BookCard key={book._id} title={book.title} author={book.author} coverURL={book.coverURL} slug={book.slug}/>
          ))
        ) : (
          <div className="library-no-results">
            <p>No books found{searchQuery && ` matching "${searchQuery}"`}</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default page
