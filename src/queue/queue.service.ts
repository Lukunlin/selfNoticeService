import { Injectable } from "@nestjs/common"
import { Queue } from "bull"
import { InjectQueue } from "@nestjs/bull"

@Injectable()
export class QueueService {
	constructor(@InjectQueue("noticeMsg") private queueService: Queue) {}

	public pushNoticeMsg(Msg: string, options: any = {}) {
		this.queueService.add("noticeMessage", Msg, options)
	}
}
