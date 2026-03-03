'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

const LibrarySearchBar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') || '';

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    
    if (query.trim() === '') {
      router.push('/');
    } else {
      router.push(`/?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="library-search-wrapper">
      <Search className="w-5 h-5 text-[#3d485e] ml-3" />
      <input
        type="text"
        placeholder="Search by title or author..."
        value={currentQuery}
        onChange={handleSearch}
        className="library-search-input"
      />
    </div>
  );
};

export default LibrarySearchBar;
