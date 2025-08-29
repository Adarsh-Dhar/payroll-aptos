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
    async jwt({ token, account, profile }: { token: any; account: any; profile?: any }) {
      if (account) {
        ;(token as any).accessToken = (account as any).access_token
      }
      if (profile) {
        ;(token as any).githubUsername = (profile as any).login
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      ;(session as any).accessToken = (token as any).accessToken
      ;(session as any).user.githubUsername = (token as any).githubUsername
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }


