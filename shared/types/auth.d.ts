declare module '#auth-utils' {
  interface User {
    id: string
    githubId: string
    login: string
    name?: string | null
    avatarUrl: string
  }

  interface UserSession {
    loggedInAt?: string | Date
  }
}

export {}
