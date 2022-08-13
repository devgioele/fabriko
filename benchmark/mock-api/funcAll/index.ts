import type { AzureFunction, Context, HttpRequest } from '@azure/functions'
import HttpStatusCode from '../lib/httpStatusCode'

const httpTrigger: AzureFunction = async (
  context: Context,
  _req: HttpRequest
) => {
  context.res = {
    status: HttpStatusCode.OK
  }
}

export default httpTrigger
