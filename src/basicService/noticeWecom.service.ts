import { Injectable } from "@nestjs/common"
import { NoticeService } from "../queue/queue.service"
import { isDev } from "../utils/common"

@Injectable()
export class NoticeWecomService {
	constructor(private readonly noticeService: NoticeService) {}

	/*
	 * 暴露对外提供发送信息收集的接口
	 * */
	public pushMsg(data) {
		if (isDev) {
			return false
		}
		return this.addMsg(data)
	}

	private addMsg(data) {
		let sendData: string | string[] = this.analysis(data)
		sendData = this.checkDataLimit(sendData)
		if (typeof sendData === "string") {
			this.submitMsg(sendData)
		} else {
			for (let i = 0; i < sendData.length; i++) {
				this.submitMsg(sendData[i], i + 1)
			}
		}
		return true
	}

	private analysis(data): string {
		if (typeof data === "string") {
			return data
		}
		const dataType = Object.prototype.toString.call(data)
		if (dataType === "[object Object]" || dataType === "[object Array]") {
			try {
				return JSON.stringify(data)
			} catch (err) {}
		}
		return dataType
	}

	private checkDataLimit(data: string): string | string[] {
		const baseNum = 660
		const length = data.length
		const num = Math.ceil(length / baseNum)
		if (num <= 1) {
			return data
		}
		const pushData: string[] = []
		for (let i = 0; i < num; i++) {
			const first = i * baseNum + (i === 0 ? 0 : 1)
			const after = (i + 1) * baseNum
			pushData.push(data.slice(first, after))
		}
		return pushData
	}

	private submitMsg(data: string, pages?: number) {
		const sendMsg = data
		const options = pages ? { pageNum: pages } : {}
		this.noticeService.pushNoticeMsg(sendMsg, options)
	}

	public submitMsgForCzb(data: string, options = {}) {
		const sendMsg = data
		this.noticeService.pushNoticeForCzb(sendMsg, options)
	}
}
