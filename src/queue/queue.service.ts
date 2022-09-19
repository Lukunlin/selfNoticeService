import { Injectable } from "@nestjs/common"
import { Queue } from "bull"
import { InjectQueue } from "@nestjs/bull"

@Injectable()
export class NoticeService {
	constructor(@InjectQueue("noticeMsg") private queueService: Queue) {}

	public pushNoticeMsg(Msg: string, options: any = {}) {
		this.queueService.add("noticeMessage", Msg, options)
	}

	public pushNoticeForCzb(Msg: string, options: any = {}) {
		this.queueService.add("noticeForCzb", Msg, options)
	}

	public pushMarkdownForCzb(markdownContent: string, options: any = {}) {
		this.queueService.add("markdownForCzb", markdownContent, options)
	}
}
