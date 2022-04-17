import { LoggerService } from "../logger/logger.service"

// 实例化一些场外对象
const Logger = new LoggerService()

// 自动重试的工具方法
const allowRetry = async function <T>(runFn: () => Promise<T>, retriesLeft = 3, interval = 100, exponential = false): Promise<T> {
	try {
		const val = await runFn()
		return val
	} catch (error) {
		if (retriesLeft) {
			Logger.write("warning", `执行业务函数的时候失败了,正准备重试\n执行的函数名为: ${runFn.name}`)
			await new Promise((resolve) => setTimeout(resolve, interval))
			return allowRetry(runFn, retriesLeft - 1, exponential ? interval * 2 : interval, exponential)
		} else {
			Logger.write("fatal", `最大重复重试执行业务函数失败了,执行函数名为: ${runFn.name}`)
			return Promise.reject(`Max retries reached for function retry`)
		}
	}
}

export default allowRetry
