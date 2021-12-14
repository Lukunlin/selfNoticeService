import { Injectable, NestInterceptor, CallHandler, ExecutionContext } from "@nestjs/common"
import { Observable } from "rxjs"
import { map, tap } from "rxjs/operators"
import { IncomingMessage, ServerResponse } from "http"
import { isDev } from "../utils/common"
import { IResponse } from "../../types"

/**
 * 全局response的拦截器
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, IResponse<T>> {
	intercept(context: ExecutionContext, next: CallHandler<T>): Observable<IResponse<T>> {
		const ctx = context.switchToHttp()
		const res = ctx.getResponse<ServerResponse>()
		const req = ctx.getRequest<IncomingMessage>()

		return next
			.handle()
			.pipe(
				map((data): IResponse => {
					/**
					 * 自定义特殊处理,如果拿到最终返回结果为一个函数,则直接使用函数返回值作为返回结果
					 */
					if (typeof data === "function") {
						return data(ctx, res)
					}
					// 否则就按照默认格式返回
					return {
						data,
						status: res.statusCode,
						info: "success"
					}
				})
			)
			.pipe(
				tap((dataResult) => {
					if (isDev) {
						console.log(`响应拦截器: request = ${req.url}; methods = ${req.method}`)
						console.warn("response = ", dataResult, "\n")
					}
				})
			)
	}
}
