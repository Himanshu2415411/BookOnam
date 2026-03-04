import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import UploadForm from '@/components/UploadForm'

const page = async () => {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }
  return (
    <main className='wrapper container'>
      <section className='flex flex-col gap-5'>
        <h1 className='page-title-xl'>Add a New Book</h1>
        <p className='subtitle'>Upload a PDF to generate your interactive interview</p>
      </section>

      <div className='new-book-wrapper'>
        <UploadForm />
      </div>
    </main>
  )
}

export default page
