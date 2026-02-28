import React from 'react'
import UploadForm from '@/components/UploadForm'

const page = () => {
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
