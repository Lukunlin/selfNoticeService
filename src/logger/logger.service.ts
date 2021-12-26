import { Injectable } from "@nestjs/common"
import { logger as Logger } from "../config/logger"

type TCategories = "" | "default" | "access" | "warning" | "error" | "fatal"

@Injectable()
export class LoggerService {
	private default = Logger()
	private access = Logger("access")
	private warn = Logger("warn")
	private err = Logger("err")
	private fat = Logger("fat")

	public write(categories: TCategories, data: any) {
		if (categories === "" || categories === "default") {
			return this.default.debug(data)
		} else if (categories === "access") {
			return this.access.info(data)
		} else if (categories === "warning") {
			return this.warn.warn(data)
		} else if (categories === "error") {
			return this.err.error(data)
		} else if (categories === "fatal") {
			return this.fat.fatal(data)
		}
	}

	public getDefault() {
		return this.default
	}
	public getAccess() {
		return this.access
	}
	public getWarning() {
		return this.warn
	}
	public getError() {
		return this.err
	}
	public getFatal() {
		return this.fat
	}
}
