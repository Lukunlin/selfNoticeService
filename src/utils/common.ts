export const buildModal: string = process.env.npm_lifecycle_event || ""
export const isDev: boolean = /^dev/.test(buildModal)
export const isDebug: boolean = /^dev\:debug/.test(buildModal)
