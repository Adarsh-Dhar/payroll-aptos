import NextAuth, { type NextAuthOptions } from "next-auth"
import GitHub from "next-auth/providers/github"

export const authOptions: NextAuthOptions = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: { scope: "read:user user:email" },
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  // trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  callbacks: {
    async jwt({ token, account, profile }: { token: unknown; account: unknown; profile?: unknown }) {
      if (account) {
        ;(token as { accessToken?: string }).accessToken = (account as { access_token?: string }).access_token
      }
      if (profile) {
        ;(token as { githubUsername?: string }).githubUsername = (profile as { login?: string }).login
      }
      return token
    },
    async session({ session, token }: { session: unknown; token: unknown }) {
      ;(session as { accessToken?: string }).accessToken = (token as { accessToken?: string }).accessToken
      ;(session as { user: { githubUsername?: string } }).user.githubUsername = (token as { githubUsername?: string }).githubUsername
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }


