import { ConfigModule } from "@nestjs/config"

export const publicImportsForRoot = () => {
	return ConfigModule.forRoot({
		envFilePath: [".env.development.local", ".env.local", ".env.development", ".env"],
		ignoreEnvFile: false,
		isGlobal: true
	})
}
