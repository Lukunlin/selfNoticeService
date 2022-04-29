import { Injectable, HttpService, HttpException, HttpStatus } from "@nestjs/common"
import { IGitlabWebHooks, IProdNoticeBody, IWegeTableEnvData } from "../../../types/gitlabHook"
import * as Moment from "moment"
import { NoticeWecomService } from "../../basicService/noticeWecom.service"
import { LoggerService } from "../../logger/logger.service"
import allowRetry from "../../utils/allowRetry"

interface IPushWeigeTableUpdated {
	done: boolean
	oldState: string
	setState: string
	projectName: string
	isFixBug: boolean
	commitId: string
	developers: string
}
interface IPushNewsMsgToWecom {
	url: string
	picurl?: string
	title: string
	description: string
}

@Injectable()
export class CzbGitNoticeService {
	constructor(private readonly httpService: HttpService, private readonly noticeService: NoticeWecomService, private readonly loggerService: LoggerService) {}

	protected readonly bannerImgArray: string[] = [
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/ad6df1610475a931f0c128cc754a.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/4834ee161fe8a6ba00296ac0a007.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/7301481de7f3d1535afb81f2e0ae.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/b8cb2bf92836bc871d6a95e270ff.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/170329e6d7aa9ac92cb9487ea123.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2021/12/28/13/b77368ce5a9418898ddce8a15aff.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/d7269f8167bbf5d04f52d2039d90.png",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/a32b946a0b276e75dfcf08389c4b.png",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/4d4f7f25a71ce491b0e3afbab3b0.png",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/cd6eeb83857bdf38e3de8b659de2.png",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/e762b36e6aeec835e263838b2b94.png",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/09ec9425f9c96e6f89c682541fd4.png",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/79124a55b1e2dec360f5a856e5b1.png",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/2f6b323e19fdb9e129b1faa6c7df.jpg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/fb1a268c66cb502a68bde7b00462.jpeg",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/c87daa50608d74d39ca400a89021.png",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/2345860f2910a365f8e1e0e9be24.png",
		"https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/04/01/22/7ceb997be98071a715d5d0332019.png"
	]
	protected readonly targetUrl: string = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.WECHOM_NOTICE_DEPARTMENT}`
	protected wegeTabkleData?: IWegeTableEnvData

	protected getRandomNumber(minNum: number, maxNum: number): number {
		switch (arguments.length) {
			case 1:
				return parseInt(String(Math.random() * minNum + 1), 10)
				break
			case 2:
				return parseInt(String(Math.random() * (maxNum - minNum + 1) + minNum), 10)
				break
			default:
				return 0
				break
		}
	}
	protected getWegeTableData(): IWegeTableEnvData {
		if (this.wegeTabkleData) {
			return this.wegeTabkleData
		} else {
			try {
				this.wegeTabkleData = JSON.parse(process.env.WEGE_DATA)
				return this.wegeTabkleData
			} catch (err) {
				throw new HttpException("缺少正确的环境变量", HttpStatus.PRECONDITION_FAILED)
			}
		}
	}
	protected pushNewsMsgToWecom(data: IPushNewsMsgToWecom, retriesLeft = 5, interval = 1000) {
		return allowRetry(
			() =>
				this.httpService
					.post(this.targetUrl, {
						msgtype: "news",
						news: {
							articles: [
								{
									url: data.url,
									title: data.title,
									picurl: data.picurl || this.getRandomImage(),
									description: data.description
								}
							]
						}
					})
					.toPromise(),
			retriesLeft,
			interval
		)
	}
	public getRandomImage() {
		const randomNumber = this.getRandomNumber(0, this.bannerImgArray.length - 1)
		return this.bannerImgArray[randomNumber]
	}
	public async pushNewsToWecom(body: IGitlabWebHooks) {
		const ProjectName = body.project.name || "unknow"
		const LastAuthor = body.user_name || "unknow"
		const Warehouse = body.project.web_url || "https://gitlab.nlsaas.com"
		const Method = body.event_name
		const CommitCount = body.total_commits_count || 0
		const CommitList = body.commits || []
		const CommitItem = CommitList[CommitList.length - 1] || CommitList[0]
		const CurrentDate = Moment()
		const CurrentDateFormat = CurrentDate.format("MM月DD日 HH:mm:ss")
		const CurrentHour = CurrentDate.hours()
		const updatedBranchSplit = (body.ref || "").split("/")
		const updatedBranch = updatedBranchSplit[updatedBranchSplit.length - 1] || "unknow"
		let projectChineseName = "项目"
		let SubContent = "\n主线分支更新啦~"

		if (Method !== "push") {
			return false
		}
		if (ProjectName === "mp") {
			const MainBranchArrs = (process.env.SAAS_MP_MAIN_BRANCH || "master").split(",")
			if (!MainBranchArrs.includes(updatedBranch)) {
				// 不在白名单的分支不推送
				return false
			}
			projectChineseName = "Saas商户平台"
			if (updatedBranch !== "master") {
				SubContent = "\n收到关键分支更新提醒"
			}
		} else if (ProjectName === "taro_micro") {
			projectChineseName = "Saas加油小程序"
		} else if (ProjectName === "webAppService") {
			projectChineseName = "Saas公众号"
		} else if (ProjectName === "mp_micro") {
			projectChineseName = "Saas商家助手小程序"
		} else if (ProjectName === "mini_micro") {
			projectChineseName = "Saas流量版小程序"
		}
		const pushTitle = `${projectChineseName}  [${ProjectName}]${SubContent}`
		let pushDescription = `\n本次更新分支为: 【 ${updatedBranch} 】`
		pushDescription += `\n--------------------------------------`
		pushDescription += `\n操作人: ${LastAuthor}`
		pushDescription += `\n推送时间为: ${CurrentDateFormat}`
		pushDescription += `\n本次更新的commit数量为: ${CommitCount}个`
		if (CommitItem && Object.keys(CommitItem).length) {
			if (CommitItem.author) {
				pushDescription += `\n最后Commit更新提交人: ${CommitItem.author.name || "unknow"}`
			}
			if (CommitItem.timestamp) {
				pushDescription += `\n最后Commit更新时间: ${Moment(CommitItem.timestamp).format("YYYY年MM月DD日 HH:mm:ss")}`
			}
			if (CommitItem.message || CommitItem.title) {
				pushDescription += `\n以下为本次最后更新的commit内容:\n--------------------------------------\n${CommitItem.message || CommitItem.title}`
			}
		}

		try {
			await this.pushNewsMsgToWecom({
				url: CommitItem.url || `${Warehouse}/-/commit/${CommitItem.id}`,
				title: pushTitle,
				description: pushDescription
			})
			this.noticeService.submitMsgForCzb(`【${projectChineseName}】已经收到更新~\n请大家检查各自的开发分支和有依赖的相关分支进行及时的更新。`)
			return true
		} catch (err) {
			this.loggerService.write("warning", err)
			return false
		}
	}

	public async pushProdNoticeToWecom(body: IProdNoticeBody) {
		const RELEASE_CONTENT = body.job
		const ClientName = /PRD-front-mp-deploy/i.test(RELEASE_CONTENT) ? "Saas商户平台" : /PRD-front-webappservice-deploy/i.test(RELEASE_CONTENT) ? "微信公众号H5" : ""
		if (ClientName) {
			let title = ``
			let content = ``
			let banner = ``
			const RELEASE_PEOPLE = RELEASE_CONTENT.split(" ")[0] || "Admin"
			let onlineUrl = ``

			content += `\n关联负责人： ${RELEASE_PEOPLE}`
			content += `\n发布单号： ${body.deploy_num}`
			content += `\n发布分支： ${body.git_branch}`
			if (/green/i.test(RELEASE_CONTENT)) {
				// 发布灰度
				title = `Saas商户平台【灰度环境-绿】\n发布上线`
				banner = `https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/01/14/17/3bcd27e04dacefe46cf1ff1d26ad.jpeg`
				content += `\n\n请相关人员立即检查目前灰度环境的代码是否上线成功`
				onlineUrl = `\nhttps://green-mp.nlsaas.com/login\n `
			} else if (/blue/i.test(RELEASE_CONTENT)) {
				// 发布线上
				title = `Saas商户平台【生产环境-蓝】\n发布上线`
				banner = `https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/01/14/17/2c8423e89a52b3e86a9690600b16.jpeg`
				content += `\n\n请相关人员立刻检查目前生产环境的代码是否上线成功\n检查完毕后,大概等待30分钟后回归Master分支~`
				onlineUrl = `\n不带灰度的域名\nhttps://blue-mp.nlsaas.com/login\n\n客户使用的域名\nhttps://mp.nlsaas.com/login\n `
			} else {
				return false
			}

			try {
				// 先推送一张卡片
				await this.pushNewsMsgToWecom({
					title,
					picurl: banner,
					description: content,
					url: "https://docs.qq.com/sheet/DTXBVRm5GRkJXUnNN?tab=jpkgbl&_t=1637835768119"
				})
				// 并且推送更新到维格表格的项目状态表，完成闭环
				const updatedResult = await this.pushWeigeTableUpdated(body)
				// 再推送一个通知到企业微信报告commitId
				const isDoneInterface = (data): data is IPushWeigeTableUpdated => {
					return data.done !== undefined
				}
				let noticeSub = `最后的CommitId： ${body.commitID}\n`
				let noticeMembers: string[] = []
				if (isDoneInterface(updatedResult)) {
					const WEGE_DATA = this.getWegeTableData()
					noticeSub = `${updatedResult.isFixBug ? "本次修复内容" : "本次发布项目有"}:\n${updatedResult.projectName}\n${updatedResult.developers ? `\n本次涉及开发人员有: ${updatedResult.developers}\n` : ""}\n本次项目的状态更改已经同步到维格表格,状态从{${updatedResult.oldState}}更改为{${updatedResult.setState}}\n${noticeSub}\n维格表格的传送门:\nhttps://vika.cn/workbench/${WEGE_DATA.database}/${WEGE_DATA.viewId}\n`
					try {
						// 拿到相关开发人员做通知
						noticeMembers = updatedResult.developers
							? updatedResult.developers
									.split(",")
									.map((e) => {
										return e.trim ? e.trim() : ""
									})
									.filter((e) => e)
							: []
					} catch (mErr) {
						this.loggerService.write("warning", mErr)
					}
				}
				noticeSub += `\n关于发布文档记录请点击上方卡片进入文档查看。`
				noticeSub += `\n本次发布线上验证地址请点击下方：${onlineUrl}\n`
				const submitMsgForCzb_Option: { noticeAll: boolean; noticeMember?: string[] } = { noticeAll: true }
				if (noticeMembers && noticeMembers.length) {
					submitMsgForCzb_Option.noticeMember = noticeMembers
				}
				this.noticeService.submitMsgForCzb(noticeSub, submitMsgForCzb_Option)
				return true
			} catch (err) {
				this.loggerService.write("warning", err)
				return false
			}
		}
		return false
	}
	public async pushWeigeTableUpdated(body: IProdNoticeBody): Promise<boolean | IPushWeigeTableUpdated> {
		// 先查询到表近期的行记录
		const WEGE_DATA = this.getWegeTableData()
		const PAGE_SIZE = 20
		const TABLE_STATE_LIST = {
			UAT_READY: "预备进行中",
			GREEN: "灰度中",
			PROD: "全量放流",
			SCRIPT_GREEN: "灰度中(机器更改状态)",
			SCRIPT_PROD: "全量放流(机器更改状态)"
		}
		const CurrentDate = Moment()
		try {
			const RPC_QueryProjectState = () => {
				return this.httpService
					.get(`https://api.vika.cn/fusion/v1/datasheets/${WEGE_DATA.database}/records?viewId=${WEGE_DATA.viewId}&fieldKey=id&cellFormat=string&pageNum=1&pageSize=${PAGE_SIZE}`, {
						headers: {
							Authorization: `Bearer ${WEGE_DATA.apiToken}`
						}
					})
					.toPromise()
			}
			const { status: QueryOneLineStatus, data: QueryOneLineResult } = await allowRetry(RPC_QueryProjectState, 5, 300)
			if (QueryOneLineStatus !== 200 || QueryOneLineResult.code !== 200) {
				return false
			}
			const QueryList = QueryOneLineResult?.data?.records
			let QueryItem
			if (QueryList.length) {
				QueryItem = QueryList.find((listItem) => {
					const querycommitID = listItem?.fields?.fldrjWB0T3Xac || ""
					return querycommitID.indexOf(body.commitID) !== -1
				})
			}
			if (!QueryItem) {
				return false
			}
			const { fields: QueryFieldsItem = {}, recordId: RecordId } = QueryItem
			const { flde5dnuyrir6: Release_project_name = "", fldK4XxBUSpb9: Release_projectForBugFix = "", fld4PS6m5Z2R5: BarchText = "", fldrjWB0T3Xac: CommitId = "", fldBqqaCgimt5: ProjectStateText = "", fldD8isRN6RAw: Developer = "", fldOzcM5HqWzK: Remark = "" } = QueryFieldsItem
			const isFixBug = !Release_project_name && Release_projectForBugFix
			// 对比最后的CommitId是否一致
			const MatchBeBodyCommitRegexp = new RegExp(`\\W?${body.commitID.trim()}\\W?`)
			if (!MatchBeBodyCommitRegexp.test(CommitId.trim())) {
				return false
			}
			const ReallyBranch = body.git_branch.match(/(origin\/)?([\w-_.]+)/)[2]
			const isReleaseWithGreen = /green/i.test(body.job)
			// 查看当前行记录里是否因为匹配到这个分支
			if (BarchText.indexOf(ReallyBranch) === -1) {
				return false
			}
			let setProjectState = ""
			let isSetRemark = `本次脚本修改状态时间为:【${CurrentDate.format("MM月DD日 HH:mm:ss")}】,状态从`
			let setRowLine = {}
			if (isReleaseWithGreen) {
				// 发灰度
				if (ProjectStateText === TABLE_STATE_LIST["UAT_READY"]) {
					setProjectState = TABLE_STATE_LIST["SCRIPT_GREEN"]
					isSetRemark += `【${TABLE_STATE_LIST["UAT_READY"]}】修改为【${setProjectState}】`
				}
			} else {
				if (ProjectStateText === TABLE_STATE_LIST["UAT_READY"]) {
					// 从预备中直接发到生产
					setProjectState = TABLE_STATE_LIST["SCRIPT_PROD"]
					isSetRemark += `【${TABLE_STATE_LIST["UAT_READY"]}】修改为【${setProjectState}】`
				} else if (ProjectStateText === TABLE_STATE_LIST["GREEN"] || ProjectStateText === TABLE_STATE_LIST["SCRIPT_GREEN"]) {
					// 灰度放流
					setProjectState = TABLE_STATE_LIST["SCRIPT_PROD"]
					isSetRemark += `【${TABLE_STATE_LIST["GREEN"]}】修改为【${setProjectState}】`
				}
			}
			if (!setProjectState) {
				return false
			}
			if (Remark) {
				isSetRemark = `${Remark}\n${isSetRemark}`
			}
			setRowLine = {
				recordId: RecordId,
				fields: {
					fldBqqaCgimt5: setProjectState,
					fldOzcM5HqWzK: isSetRemark
				}
			}
			// 发起updated请求
			const RPC_UpdateProjectState = () => {
				return this.httpService
					.patch(
						`https://api.vika.cn/fusion/v1/datasheets/${WEGE_DATA.database}/records?viewId=${WEGE_DATA.viewId}&fieldKey=name`,
						{
							fieldKey: "id",
							records: [setRowLine]
						},
						{
							headers: {
								Authorization: `Bearer ${WEGE_DATA.apiToken}`,
								"Content-Type": "application/json"
							}
						}
					)
					.toPromise()
			}
			const updateResultResult = await allowRetry(RPC_UpdateProjectState, 3, 200)
			if (updateResultResult.status === 200 && updateResultResult?.data?.code === 200) {
				let releaseProjectNameListFormat = Release_project_name
				if (releaseProjectNameListFormat) {
					releaseProjectNameListFormat = releaseProjectNameListFormat
						.split(",")
						.filter((str) => str)
						.map((str) => {
							return str.trim ? `- ${str.trim()}\n` : str
						})
						.join("")
				}
				return {
					done: true,
					oldState: ProjectStateText,
					setState: setProjectState,
					projectName: isFixBug ? Release_projectForBugFix : releaseProjectNameListFormat,
					developers: Developer,
					isFixBug: isFixBug,
					commitId: CommitId.trim()
				}
			}
		} catch (writeTableErr) {
			this.loggerService.write("warning", writeTableErr)
		}
		return false
	}
}
