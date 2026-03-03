import React from 'react'
import { auth } from "@clerk/nextjs/server";
import { redirect } from 'next/navigation';
import HeroSection from '@/components/HeroSection'
import BookCard from '@/components/BookCard'
import { getUserBooks } from '@/lib/actions/book.actions'

const page = async () => {
  // Require authentication
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }
  
  const bookResults = await getUserBooks(userId);
  const books = bookResults.success ? bookResults.data ?? [] : [];

  return (
    <main className='wrapper container'>
      <HeroSection />

      <div className = "library-books-grid">
        {
          books.map((book)=> (
            <BookCard key={book._id} title = {book.title} author={book.author} coverURL={book.coverURL} slug = {book.slug}/>
          ))
        }

      </div>

    </main>
  )
}

export default page
