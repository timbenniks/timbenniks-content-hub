import NextAuth from "next-auth";
import { getContentstackEndpoints } from "@timbenniks/contentstack-endpoints";
import { db } from "./db";

const region = process.env.CONTENTSTACK_REGION ?? "na";
const endpoints = getContentstackEndpoints(region);
const appUrl = endpoints.application!;
const apiUrl = endpoints.contentManagement!;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },

  providers: [
    {
      id: "contentstack",
      name: "Contentstack",
      type: "oauth",
      checks: ["state"],
      authorization: {
        url: `${appUrl}/apps/${process.env.CONTENTSTACK_APP_ID}/authorize`,
        params: { response_type: "code", scope: "user:read" },
      },
      token: `${appUrl}/apps-api/token`,
      userinfo: {
        url: `${apiUrl}/v3/user`,
        async request({ tokens }: { tokens: { access_token: string } }) {
          const res = await fetch(`${apiUrl}/v3/user`, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          const { user } = await res.json();
          return user;
        },
      },
      profile: (p: any) => ({
        id: p.uid,
        name:
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          p.username ||
          p.email,
        email: p.email,
        image: p.profile_image ?? null,
      }),
      clientId: process.env.CONTENTSTACK_CLIENT_ID,
      clientSecret: process.env.CONTENTSTACK_CLIENT_SECRET,
    },
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && user.email) {
        // Ensure user exists in database
        await db.user.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            name: user.name || null,
            image: user.image || null,
          },
          update: {
            name: user.name || null,
            image: user.image || null,
          },
        });
      }
      return true;
    },
    session: ({ session, token }) => {
      if (token.sub) (session.user as any).id = token.sub;
      return session;
    },
    jwt: ({ token, user }) => {
      if (user) token.sub = user.id;
      return token;
    },
  },
});

export const getSession = () => auth();
