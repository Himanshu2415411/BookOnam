# Task: Create Vapi Search Book API Route

## Plan

### 1. Information Gathered
- **BookSegment Model**: Contains `bookId`, `content`, `segmentIndex`, `pageNumber`, `wordCount` fields. Text search index exists on content field.
- **Existing Actions**: `saveBookSegments` in `lib/actions/book.actions.ts` for saving segments.
- **Vapi Integration**: Uses Vapi AI with assistant ID, passes `bookId` as a variable to the assistant.
- **Tool Call Pattern**: Vapi makes tool calls to the backend with tool name and parameters.

### 2. Plan

#### Step 1: Add Search Book Segments Function
- **File**: `lib/actions/book.actions.ts`
- Add new function `searchBookSegments(bookId, query, numSegments)` that:
  - Connects to database
  - Uses MongoDB text search or regex to find matching segments
  - Returns top N segments with their content

#### Step 2: Create Vapi Search Book API Route  
- **File**: `app/api/vapi/search-book/route.ts`
- Create POST route that:
  - Handles Vapi tool call with tool name "search_book"
  - Extracts `bookId` and `query` from parameters
  - Calls `searchBookSegments` with bookId, query, and 3 segments
  - Combines matching segments with their contents (separated by double newlines)
  - Returns result string, or "no information found about this topic" if no matches

### 3. Dependent Files
- `lib/actions/book.actions.ts` - Add search function
- Create new: `app/api/vapi/search-book/route.ts` - API route

### 4. Followup Steps
- Test the API route manually with mock Vapi tool call payload
- Ensure database connection works properly
