import { Sandbox } from '@e2b/code-interpreter'
import { env } from '../../env'


export const sbx = await Sandbox.create({ apiKey: env.E2B_API_KEY })