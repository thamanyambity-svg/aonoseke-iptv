---
name: "Next.js Supabase Development"
description: "Use when: building web features in Next.js with PostgreSQL queries via Supabase. Covers API routes, database interactions, authentication, and real-time subscriptions."
applyTo: "**/*.ts(x)"
---

# Next.js + Supabase Instruction

## Query Patterns

### Supabase RLS Policies
Always define Row-Level Security (RLS) policies for data isolation:
```sql
CREATE POLICY "Users can read own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);
```

### Optimized SQL Queries
```typescript
// ✓ Good: Explicit columns, single query
const posts = await supabase
  .from('posts')
  .select('id, title, created_at, users(name, avatar)')
  .eq('published', true)
  .order('created_at', { ascending: false })
  .limit(10);

// ✗ Avoid: SELECT *, multiple queries, N+1 patterns
```

### API Route Structure
```typescript
// app/api/posts/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient();
    const { data, error } = await supabase.from('posts').select('*');
    
    if (error) throw error;
    return Response.json({ data }, { status: 200 });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
```

## Real-Time Subscriptions
Use Supabase realtime for live updates without polling:
```typescript
const channel = supabase
  .channel('public:posts')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();
```

## Authentication
- Use Supabase Auth middleware for protected routes
- Store JWT in httpOnly cookies for XSS protection
- Implement token refresh logic in middleware

---
