import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

const handler = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: { scope: "read:user user:email" },
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  // trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        ;(token as any).accessToken = (account as any).access_token
      }
      return token
    },
    async session({ session, token }) {
      ;(session as any).accessToken = (token as any).accessToken
      return session
    },
  },
})

export { handler as GET, handler as POST }


