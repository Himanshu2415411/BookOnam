'use server';

import { connectToDatabase } from "@/database/mongoose";
import { CreateBook, TextSegment } from "@/types";
import {generateSlug, serializeData} from '@/lib/utils';
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/bookSegment.model";
import { title } from "process";


export const getAllBooks = async () => {
    try{
        await connectToDatabase();
        const books = await Book.find().sort({createdAt: -1}).lean();

        return {
            success: true,
            data: serializeData(books),
        }
    }catch(error) {    
        console.error('Error fetching books:', error);
        return {
            success: false,
            message: 'Failed to fetch books'
        }
    }
}

export const checkBookExists = async (slug: string) => {
    try{
        await connectToDatabase();
        const slug = generateSlug(title);
        const existingBook = await Book.findOne({ slug }).lean();

        if(existingBook) {
            return {
                exists: true,
                data: serializeData(existingBook)
            }
        }
    }
    catch(error) {
        console.error('Error checking book exists:', error);
        return {
            exists: false,
            error: error,
            message: 'Database connection error'
        }
    }
}

export const createBook = async (data: CreateBook) => {
    try{
        await connectToDatabase();

        const slug = generateSlug(data.title);

        const existingBook = await Book.findOne({ slug }).lean();

        if(existingBook) {
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true,
            }
        }
        //Todo: check subscription limits before creating book
        const book = await Book.create({...data, slug, totalSegments: 0});

        return {
            success: true,
            data: serializeData(book),
            alreadyExists: false,
        }

    }catch(error) {
        console.error('Error creating book:', error);
        return {
            success: false,
            message: 'Failed to create book'
        }
    }  
}

export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {
    try{
        await connectToDatabase();

        console.log('Saving segments for bookId:', bookId, 'clerkId:', clerkId, 'number of segments:', segments.length);

        const segmentsToInsert = segments.map(({text, segmentIndex, pageNumber, wordCount}) => ({
            clerkId, bookId, content: text, segmentIndex, pageNumber, wordCount
        })
        );
        await BookSegment.insertMany(segmentsToInsert);

        //update total segments in book
        await Book.findByIdAndUpdate(bookId, { $inc: { totalSegments: segments.length } });

        console.log('Successfully saved segments for bookId:', bookId);

         return {
            success: true,
            data: {segmentsCreated: segments.length},
            message: 'Book segments saved successfully'
        }
    }
    catch(error) {
        console.error('Error saving book segments:', error);

        await BookSegment.deleteMany({bookId});
        await Book.findByIdAndDelete(bookId);
        console.log('Deleted book and segments due to error');

         return {
            success: false,
            message: 'Failed to save book segments'
        }
    }
}