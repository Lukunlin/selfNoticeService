export interface IResponse<T = any> {
	data: T
	status: number
	info: string
	requestId?: string
}
