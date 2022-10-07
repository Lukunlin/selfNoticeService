import { Injectable } from "@nestjs/common"
import { Queue } from "bull"
import type { JobOptions } from "bull/index"
import { InjectQueue } from "@nestjs/bull"

export interface IOptions extends JobOptions {
	[key: string]: any
}

@Injectable()
export class NoticeService {
	constructor(@InjectQueue("noticeMsg") private queueService: Queue) {}

	public pushNoticeMsg(Msg: string, options: IOptions = { removeOnComplete: true }) {
		const opt = Object.assign({ removeOnComplete: true }, options)
		this.queueService.add("noticeMessage", Msg, opt)
	}

	public pushNoticeForCzb(Msg: string, options: IOptions = { removeOnComplete: true }) {
		const opt = Object.assign({ removeOnComplete: true }, options)
		this.queueService.add("noticeForCzb", Msg, options)
	}

	public pushMarkdownForCzb(markdownContent: string, options: IOptions = { removeOnComplete: true }) {
		const opt = Object.assign({ removeOnComplete: true }, options)
		this.queueService.add("markdownForCzb", markdownContent, options)
	}
}
