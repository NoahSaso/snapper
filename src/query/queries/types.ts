export type NftInfoResponse = {
  // Extension can be anything. Let's check if any common image fields are
  // present and use them if so.
  extension?: {
    image?: string
    image_uri?: string
    image_url?: string
  } | null
  token_uri?: string | null
}

export type OwnerOfResponse = {
  owner: string
}
