import { clerkClient } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

export const getUser = async () => {
  const { userId } = auth()

  if (!userId) {
    return null
  }

  const user = await clerkClient.users.getUser(userId)
  return user
}

export const updateUserMetadata = async (metadata: Record<string, any>) => {
  const { userId } = auth()

  if (!userId) {
    throw new Error("Usuario no autenticado")
  }

  return await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: metadata,
  })
}
