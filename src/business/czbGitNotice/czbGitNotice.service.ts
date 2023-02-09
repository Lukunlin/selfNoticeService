import { Injectable, HttpService, HttpException, HttpStatus } from "@nestjs/common"
import { IGitlabWebHooks, IProdNoticeBody, IWegeTableEnvData, IGitlabHookCommits } from "../../../types/gitlabHook"
import * as Moment from "moment"
import { NoticeWecomService } from "../../basicService/noticeWecom.service"
import { LoggerService } from "../../logger/logger.service"
import allowRetry from "../../utils/allowRetry"
import { stringify } from "querystring"

interface IPushWeigeTableUpdated {
	done: boolean
	oldState: string
	setState: string
	projectName: string
	fixRemark: string
	isFixBug: boolean
	isUpdated: boolean
	isBatchBlue: boolean
	commitId: string
	developers: string
	IdentificationList: any[]
}
interface IPushNewsMsgToWecom {
	url: string
	picurl?: string
	title: string
	description: string
}
interface IProjectInfo {
	[type: string]: {
		name: string
		mainFile: string[]
	}
}
interface IWeigeTableParam {
	/**
	 * （选填）视图ID。默认为维格表中第一个视图。请求会返回视图中经过视图中筛选/排序后的结果，可以搭配使用fields参数过滤不需要的字段数据
	 */
	viewId?: string
	/**
	 * （选填）指定分页的页码，默认为 1，与参数pageSize配合使用。
	 */
	pageNum?: number
	/**
	 * （选填）指定每页返回的记录总数，默认为100。此参数只接受1-1000的整数。
	 */
	pageSize?: number
	/**
	 * （选填）指定 field 的查询和返回的 key。默认使用列名  'name' 。指定为 'id' 时将以 fieldId 作为查询和返回方式（使用 id 可以避免列名的修改导致代码失效问题）
	 */
	fieldKey?: "id" | "name"
	/**
	 * （选填）单元格值类型，默认为 'json'，指定为 'string' 时所有值都将被自动转换为 string 格式。
	 */
	cellFormat?: "json" | "string"
	/**
	 * （选填）限制返回记录的总数量。如果该值小于表中实际的记录总数，则返回的记录总数会被限制为该值。
	 */
	maxRecords?: number
	/**
	 * （选填）使用公式作为筛选条件，返回匹配的记录，访问 https://vika.cn/help/tutorial-getting-started-with-formulas/ 了解公式使用方式
	 */
	filterByFormula?: string
	/**
	 * （选填）指定要返回的字段（默认为字段名, 也可以通过 fieldKey 指定为字段 Id）。如果附带此参数，则返回的记录合集将会被过滤，只有指定的字段会返回。
	 *  @case ['标题', '详情', '引用次数']
	 */
	fields?: string[]
	/**
	 * （选填）recordIds 数组。如果附带此参数，则返回参数中指定的records数组。 返回值按照传入数组的顺序排序。此时无视筛选、排序。无分页，每次最多查询 1000 条
	 *  @case ['recordId1', 'recordId2']
	 */
	recordIds?: string[]
	/**
	 * （选填）对返回的记录进行排序。sort 是由多个排序对象 (sort object) 组成的数组。单个排序对象的结构为 {"order":"asc 或 desc", "field":"字段名称或字段 ID"}。查询示例：sort[][field]=客户名称&sort[][order]=asc，即按照「客户名称」列的字母升序来排列返回的记录。如果 sort 与 viewId 同时使用，则 sort 指定的排序条件将会覆盖视图里的排序条件。
	 *  @case [{ field: 'field1', order: 'desc' }]
	 */
	sort?: { field: string; order: string }[]
}
interface IWeigeTableRecords {
	recordId: string
	createdAt?: number
	updatedAt?: number
	fields: {
		[key: number | string]: any
	}
}
interface IWeigeTableResult {
	total: number
	pageNum: number
	pageSize: number
	records: IWeigeTableRecords[]
}
interface IWeigeTableResponse {
	status: number
	data: {
		code: number
		message: string
		success: boolean
		data: IWeigeTableResult
	}
}
interface IWeigeTableUpdateRecords {
	recordId: string
	fields: {
		[key: number | string]: any
	}
}
interface IWeigeTableUpdateParams {
	fieldKey?: "id" | "name"
	records: IWeigeTableUpdateRecords[]
}

enum EWeekEnum {
	日,
	一,
	二,
	三,
	四,
	五,
	六
}

@Injectable()
export class CzbGitNoticeService {
	constructor(private readonly httpService: HttpService, private readonly noticeService: NoticeWecomService, private readonly loggerService: LoggerService) {
		this.wegeTabkleData = this.getWegeTableData()
		this.wegeTabkleUrl = `https://api.vika.cn/fusion/v1/datasheets/${this.wegeTabkleData.database}/records?viewId=${this.wegeTabkleData.viewId}`
	}

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
	protected readonly projectInfo: IProjectInfo = {
		mp: {
			name: "Saas商户平台",
			mainFile: ["README.md", "babel.config.js", "jsconfig.json", "package.json", "postcss.config.js", "vue.config.js", ".browserslistrc", "editorconfig", ".eslintrc.js", ".gitignore", "public/index.html", "src/common/common.js", "src/utils/request.js", "src/utils/common.js", "src/App.vue", "src/main.js", "src/permission.js", "src/store.js"]
		},
		taro_micro: {
			name: "Saas加油小程序",
			mainFile: [
				"README.md",
				".editorconfig",
				".eslintrc",
				".nvmrc",
				".prettierignore",
				".prettierrc",
				"app.js",
				"ext.json",
				"global.d.ts",
				"package.json",
				"project.config.json",
				"run.sh",
				"helpme.sh",
				"bootstrap.js",
				"sitemap.json",
				"tsconfig.json",
				"types/taro-shim.d.ts",
				"config/alipayApiGen.js",
				"config/buildExtJson.js",
				"config/buildPlugin.js",
				"config/dev.js",
				"config/index.js",
				"config/pageMetaPlugin.js",
				"config/prod.js",
				"src/utils/user.ts",
				"src/utils/service.ts",
				"src/utils/hooks.ts",
				"src/taroComponent/Button/get-phone-number-button/index.tsx",
				"src/taroComponent/Button/getUserInfo/index.tsx",
				"src/taroComponent/loadingBlock/index.tsx",
				"src/systemConfig/config.js",
				"src/plugins/polyfillWxToTaro.ts"
			]
		},
		webAppService: {
			name: "Saas公众号H5",
			mainFile: ["README.md", ".browserslistrc", ".editorconfig", ".env.production", ".gitignore", "babel.config.js", "package.json", "tsconfig.json", "vue.config.js", "public/index.html", "src/App.vue", "src/main.ts", "src/permission.ts", "src/vant.ts", "src/utils/request.ts", "src/utils/native.ts", "src/types/index.d.ts", "src/store/index.ts", "src/components/special/keepAlive.vue", "src/common/index.ts"]
		},
		mp_micro: {
			name: "Saas商家助手小程序",
			mainFile: ["README.md", ".editorconfig", ".gitignore", "package.json", "tsconfig.json", "app.js", "babel.config.js", "postcss.config.js", "run.sh", "vue.config.js", "src/App.vue", "src/main.js", "src/pages.js", "src/utils/service.js", "src/utils/utils.js", "src/store/index.js"]
		},
		mini_micro: {
			name: "Saas流量版小程序",
			mainFile: ["README.md", ".editorconfig", ".eslintrc", ".gitignore", "package.json", "tsconfig.json", "run.sh", ".prettierrc", ".npmrc", "app.js", "babel.config.js", "global.d.ts", "project.config.json", "config/buildPlugin.js", "config/dev.js", "config/index.js", "config/prod.js", "config/mockConfig.js", "src/app.tsx", "src/utils/service.ts", "src/utils/user.ts", "src/systemConfig/config.ts"]
		}
	}
	protected readonly targetUrl: string = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.WECHOM_NOTICE_DEPARTMENT}`
	protected wegeTabkleData?: IWegeTableEnvData
	protected wegeTabkleUrl?: string = ""

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
	protected checkHaveMainFiles(commitList: IGitlabHookCommits[], projectType: string): string[] {
		const FilterList = this.projectInfo[projectType].mainFile
		let tipsFileList: string[] = []
		const pushSet: Set<string> = new Set()
		commitList.forEach((cItem) => {
			const modified = cItem.modified || []
			modified.forEach((filePath) => {
				if (FilterList.includes(filePath)) {
					pushSet.add(filePath)
				}
			})
		})
		if (pushSet.size) {
			tipsFileList = [...pushSet]
		}
		return tipsFileList
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
		const projectChineseName = this.projectInfo[ProjectName].name || "未知项目"
		const IsMaster = updatedBranch === "master"
		const SubContent = IsMaster ? "\n主线分支更新啦~" : "\n收到关键分支更新提醒"
		let notPush = false

		if (Method !== "push") {
			return false
		}
		if (ProjectName === "mp") {
			const MainBranchArrs = (process.env.SAAS_MP_MAIN_BRANCH || "master").split(",")
			if (!MainBranchArrs.includes(updatedBranch)) {
				// Mp不在白名单的分支不推送
				notPush = true
			}
		}
		const haveMainFiles = this.checkHaveMainFiles(CommitList, ProjectName)
		if (haveMainFiles.length) {
			// 如果查找到有重新的文件更新,则另外发起通知
			if (!IsMaster) {
				// 非master的话告知开发者们要注意和check
				let pushHavaMainFileChangeNoticeText = `【${projectChineseName}】项目发现了重要文件在开发分支上被更新\n`
				pushHavaMainFileChangeNoticeText += `\n提交者: ${LastAuthor}`
				pushHavaMainFileChangeNoticeText += `\n开发分支: ${updatedBranch}`
				pushHavaMainFileChangeNoticeText += `\n以下是重要分支的修改文件: (`
				haveMainFiles.forEach((filePath) => {
					pushHavaMainFileChangeNoticeText += `\n                ${filePath}`
				})
				const noticeDevelop = LastAuthor.split("（")[0]
				this.noticeService.submitMsgForCzb(`${pushHavaMainFileChangeNoticeText}\n\)`, {
					noticeMember: [noticeDevelop]
				})
			}
		}
		if (ProjectName !== "mp" && !IsMaster) {
			// 除了Mp项目其他的就不推了
			notPush = true
		}
		if (notPush) {
			return false
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
	public async pushMicroExamineToWecom(body: any) {
		this.noticeService.submitMsgForMe(`"pushMicroExamineToWecom"服务被调用 body为`)
		this.noticeService.submitMsgForMe(JSON.stringify(body))
		return false
	}

	public async pushProdNoticeToWecom(body: IProdNoticeBody) {
		const RELEASE_CONTENT = body.job
		const ClientName = /PRD-front-mp-deploy/i.test(RELEASE_CONTENT) ? "Saas商户平台" : /PRD-front-webappservice-deploy/i.test(RELEASE_CONTENT) ? "微信公众号H5" : ""
		const nowDate = Moment()
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
				title = `${ClientName}【灰度环境-绿】\n发布上线`
				banner = `https://prd-1258898587.cos.ap-beijing.myqcloud.com/public/2022/01/14/17/3bcd27e04dacefe46cf1ff1d26ad.jpeg`
				content += `\n\n请相关人员立即检查目前灰度环境的代码是否上线成功`
				onlineUrl = `\nhttps://green-mp.nlsaas.com/login\n `
			} else if (/blue/i.test(RELEASE_CONTENT)) {
				// 发布线上
				title = `${ClientName}【生产环境-蓝】\n发布上线`
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
					noticeSub = ""
					if (updatedResult.projectName) {
						noticeSub += `本次发布项目有:\n${updatedResult.projectName}\n`
					}
					if (updatedResult.fixRemark) {
						const fixMsgTitle = updatedResult.projectName ? "本次发布顺风车修复内容" : "本次修复内容"
						noticeSub += `${fixMsgTitle}: \n${updatedResult.fixRemark}`
					}
					if (updatedResult.developers) {
						noticeSub += `\n本次涉及开发人员有: \n${updatedResult.developers}\n`
					}
					noticeSub += `\n本次项目的状态更改已经同步到维格表格,状态从 {${updatedResult.oldState || "无状态"}} ---> {${updatedResult.setState}\n维格表格的传送门:\nhttps://vika.cn/workbench/${WEGE_DATA.database}/${WEGE_DATA.viewId}\n`
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
				// 推送本次更新的内容
				this.noticeService.submitMsgForCzb(noticeSub, submitMsgForCzb_Option)
				// 放流则再推送一个放流的版本统计
				if (isDoneInterface(updatedResult)) {
					if (updatedResult.isBatchBlue) {
						const vikaList = updatedResult.IdentificationList.reverse()
						const WEEK_VALUE = EWeekEnum[nowDate.days()]
						const DATE_FORMAT = nowDate.format(`YYYY年MM月DD号 星期${WEEK_VALUE} HH:mm:ss`)
						const FirstLine = vikaList[0] || {}
						const SET_RELEASE_PROJECT = new Set()
						const SET_FIXBUG_PROJECT = new Set()
						vikaList.forEach((item) => {
							if (item.flde5dnuyrir6) {
								item.flde5dnuyrir6.split(",").forEach((pText) => {
									SET_RELEASE_PROJECT.add(pText.trim ? pText.trim() : pText)
								})
							}
							if (item.fldK4XxBUSpb9) {
								item.fldK4XxBUSpb9.split(",").forEach((bText) => {
									SET_FIXBUG_PROJECT.add(bText.trim ? bText.trim() : bText)
								})
							}
						})
						const RELEASE_PROJECT_ALL_TEXT = [...SET_RELEASE_PROJECT].map((t) => `--->  ${t}`).join(`\r\n`)
						const RELEASE_FIXBUG_ALL_TEXT = [...SET_FIXBUG_PROJECT].map((t) => `--->  ${t}`).join("\r\n")
						const RELEASE_FIXBUG_ALL_CONTENT = RELEASE_FIXBUG_ALL_TEXT ? `\r\n> 本次顺风车的内容有 {${SET_FIXBUG_PROJECT.size}}个： \r\n${RELEASE_FIXBUG_ALL_TEXT}\r\n` : ""
						const MARKDOWN = `# <font color=Red>能链Saas</font> <font color=Blue size=30>版本全量放流</font> 通知服务
                                            > ### 放流时间： \`${DATE_FORMAT}\`

                                            > ### 项目灰度开始日期： \`<font color=Green>${FirstLine.fldGUSH9ZdTWm}</font>\`

                                            > ### 项目第一版本发布时间： \`<font color=Orange>${FirstLine.fld7R1Iu2zFt6}</font>\`

                                            > 本次版本标识符号为: {{ <font color=Red size=26>**${FirstLine.fldlgzJWRBBDk}**</font> }}

                                            > 本次全部上线的项目有 {${SET_RELEASE_PROJECT.size}} 个： \r\n${RELEASE_PROJECT_ALL_TEXT}
                                            ${RELEASE_FIXBUG_ALL_CONTENT}

                                            ##### <font color=Blue>请在线上再次验证完毕后 ,把相关客户端合并回 \`Master\`， 届时会重新收到 Master更新的服务通知</font>
                                        `
						setTimeout(() => {
							this.noticeService.submitMarkdownForCzb(MARKDOWN)
						}, 8000)
					}
				}

				return true
			} catch (err) {
				this.loggerService.write("warning", err)
				return false
			}
		}
		return false
	}
	protected async weigetQuery(options: IWeigeTableParam = {}): Promise<false | IWeigeTableRecords[]> {
		const defaultOpts: IWeigeTableParam = {
			fieldKey: "id",
			cellFormat: "string",
			pageNum: 1,
			pageSize: 50
		}
		const joinKey = stringify(Object.assign(defaultOpts, options) as any, "&", "=")
		const URL = `${this.wegeTabkleUrl}&${joinKey}`
		const RPC_QueryProjectState = () => {
			return this.httpService
				.get(URL, {
					headers: {
						Authorization: `Bearer ${this.wegeTabkleData.apiToken}`
					}
				})
				.toPromise()
		}
		try {
			const queryRespose = await allowRetry<IWeigeTableResponse>(RPC_QueryProjectState, 5, 300)
			const { status: QueryOneLineStatus, data: QueryOneLineResult } = queryRespose
			if (QueryOneLineStatus !== 200 || QueryOneLineResult.code !== 200) {
				return false
			}
			const QueryList = QueryOneLineResult?.data?.records
			return QueryList
		} catch (err) {
			this.loggerService.write("error", err)
			return false
		}
	}
	protected async weigetUpdate(setData: IWeigeTableUpdateParams): Promise<boolean> {
		const URL = `${this.wegeTabkleUrl}&fieldKey=name`
		const RPC_UpdateProjectState = () => {
			return this.httpService
				.patch(URL, setData, {
					headers: {
						Authorization: `Bearer ${this.wegeTabkleData.apiToken}`,
						"Content-Type": "application/json"
					}
				})
				.toPromise()
		}
		try {
			const updateResultResult = await allowRetry<{ status: number; data: { code: number; message: string; success: boolean; data: Pick<IWeigeTableResult, "records"> } }>(RPC_UpdateProjectState, 3, 200)
			return updateResultResult.status === 200 && updateResultResult?.data?.code === 200
		} catch (err) {
			this.loggerService.write("warning", err)
		}
		return false
	}
	// 根据内容查询和更新维格表格
	protected async pushWeigeTableUpdated(body: IProdNoticeBody): Promise<boolean | IPushWeigeTableUpdated> {
		// 先查询到表近期的行记录
		const TABLE_STATE_LIST = {
			UAT_READY: "预备进行中",
			GREEN: "灰度中",
			PROD: "全量放流",
			SCRIPT_GREEN: "灰度中(机器更改状态)",
			SCRIPT_PROD: "全量放流(机器更改状态)"
		}
		const CurrentDate = Moment()
		try {
			const QueryList = await this.weigetQuery()
			if (!QueryList) {
				return false
			}
			let QueryIndex = -1
			let QueryItem: IWeigeTableRecords | undefined
			if (QueryList.length) {
				QueryIndex = QueryList.findIndex((listItem) => {
					const querycommitID = listItem?.fields?.fldrjWB0T3Xac || ""
					return querycommitID.indexOf(body.commitID) !== -1
				})
				QueryItem = QueryList[QueryIndex]
			}
			if (!QueryItem) {
				return false
			}
			const { fields: QueryFieldsItem = {}, recordId: RecordId } = QueryItem
			const { flde5dnuyrir6: Release_project_name = "", fldK4XxBUSpb9: Release_projectForBugFix = "", fld4PS6m5Z2R5: BarchText = "", fldrjWB0T3Xac: CommitId = "", fldBqqaCgimt5: ProjectStateText = "", fldD8isRN6RAw: Developer = "", fldOzcM5HqWzK: Remark = "", fldlgzJWRBBDk: Identification = "" } = QueryFieldsItem
			const isFixBug = Release_projectForBugFix
			const ReallyBranch = body.git_branch.match(/(origin\/)?([\w-_.]+)/)[2]
			const isReleaseWithGreen = /green/i.test(body.job)
			let isUpdated = false
			let isBatchBlue = false
			let sameBatchs = []
			// 查看当前行记录里是否因为匹配到这个分支
			if (BarchText.indexOf(ReallyBranch) === -1) {
				return false
			}
			let setProjectState = ""
			let isSetRemark = `本次脚本修改状态时间为:【${CurrentDate.format(`MM月DD日(星期${EWeekEnum[CurrentDate.days()]}) HH:mm:ss`)}】,状态从`

			if (isReleaseWithGreen) {
				// 发灰度
				if (ProjectStateText === "" || ProjectStateText === TABLE_STATE_LIST["UAT_READY"]) {
					isUpdated = true
					setProjectState = TABLE_STATE_LIST["SCRIPT_GREEN"]
					const originState = ProjectStateText === "" ? "无状态" : TABLE_STATE_LIST["UAT_READY"]
					isSetRemark += `【${originState}】修改为【${setProjectState}】`
				}
			} else {
				isUpdated = true
				if (ProjectStateText === "" || ProjectStateText === TABLE_STATE_LIST["UAT_READY"]) {
					// 从预备中直接发到生产
					setProjectState = TABLE_STATE_LIST["SCRIPT_PROD"]
					const originState = ProjectStateText === "" ? "无状态" : TABLE_STATE_LIST["UAT_READY"]
					isSetRemark += `【${originState}】修改为【${setProjectState}】`
				} else if (ProjectStateText === TABLE_STATE_LIST["GREEN"] || ProjectStateText === TABLE_STATE_LIST["SCRIPT_GREEN"]) {
					// 灰度放流
					isBatchBlue = true
					setProjectState = TABLE_STATE_LIST["SCRIPT_PROD"]
					isSetRemark += `【${TABLE_STATE_LIST["GREEN"]}】修改为【${setProjectState}】`
				} else {
					isUpdated = false
				}
			}
			if (!setProjectState) {
				return false
			}
			if (Remark) {
				isSetRemark = `${Remark}\n${isSetRemark}`
			}
			const setRowLine: IWeigeTableUpdateRecords = {
				recordId: RecordId,
				fields: {
					fldBqqaCgimt5: setProjectState,
					fldOzcM5HqWzK: isSetRemark
				}
			}
			// 发起updated请求
			const updateResultResult = await this.weigetUpdate({
				fieldKey: "id",
				records: [setRowLine]
			})
			if (updateResultResult) {
				let releaseProjectNameListFormat = Release_project_name
				if (releaseProjectNameListFormat) {
					releaseProjectNameListFormat = releaseProjectNameListFormat
						.split(",")
						.filter((str) => str)
						.map((str) => {
							return str.trim ? `【${str.trim()}】、` : str
						})
						.join("")
					releaseProjectNameListFormat = releaseProjectNameListFormat.slice(0, -1)
					releaseProjectNameListFormat = releaseProjectNameListFormat + "\n\n"
				}
				let releaseForBugFix = Release_projectForBugFix
				if (releaseForBugFix) {
					releaseForBugFix = releaseForBugFix
						.split("\n")
						.map((eLine) => `- ${eLine}\n`)
						.join("")
				}
				if (isBatchBlue && Identification) {
					//  如果是放流的话,把列表里同一批的全部返回 sameBatchs
					const copyList = QueryList.slice(QueryIndex)
					const temporaryArr = []
					copyList.findIndex((cItem) => {
						if (cItem.fields.fldlgzJWRBBDk === Identification) {
							temporaryArr.push(cItem.fields)
						} else {
							if (temporaryArr.length) {
								sameBatchs = temporaryArr
							}
							return true
						}
					})
				}
				return {
					done: true,
					oldState: ProjectStateText,
					setState: setProjectState,
					projectName: releaseProjectNameListFormat,
					fixRemark: releaseForBugFix,
					developers: Developer,
					isUpdated,
					isBatchBlue,
					IdentificationList: sameBatchs,
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
