import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const colors = [
  '#4f46e5', '#7c3aed', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#f59e0b', '#10b981',
  '#14b8a6', '#0ea5e9', '#06b6d4', '#8b5cf6'
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400
    });
  }

  // Get the body as raw text for signature verification
  const body = await req.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400
    });
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses } = evt.data;
    const email = email_addresses?.[0]?.email_address;

    if (!email || !id) {
      return new Response('Missing required user data', { status: 400 });
    }

    // Auto-generate a unique username from the email prefix
    let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    if (baseUsername.length < 3) {
      baseUsername = 'user_' + Math.random().toString(36).slice(2, 6);
    }
    const username = `${baseUsername}_${Math.random().toString(36).slice(2, 7)}`;
    const avatarColor = getAvatarColor(id);

    // Sync to Supabase using the admin client
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('users')
      .insert({
        id: id,
        email: email,
        username: username,
        avatar_color: avatarColor
      });

    if (error) {
      console.error('Supabase error inserting user:', error);
      return new Response(`Database error: ${error.message}`, { status: 500 });
    }

    return new Response('User successfully synced to database', { status: 200 });
  }

  return new Response('Webhook received', { status: 200 });
}
