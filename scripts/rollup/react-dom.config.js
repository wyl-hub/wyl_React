import { resolvePkgPath, getPackageJSON, getBaseRollupPlugins } from "./utils"
import generatePackageJson from "rollup-plugin-generate-package-json"
import alias from "@rollup/plugin-alias"

const { name, module } = getPackageJSON("react-dom")
// 包路径  packages  (packages/react-dom)
const pkgPath = resolvePkgPath(name)
// 打包路径  dist node_modules (dist/node_modules/react-dom)
const pkgDistPath = resolvePkgPath(name, true)

export default [
  {
    input: `${pkgPath}/${module}`, // 入口文件
    output: [
      {
        file: `${pkgDistPath}/index.js`,
        name: "index.js",
        format: "umd",
      },
      {
        file: `${pkgDistPath}/client.js`,
        name: "client.js",
        format: "umd",
      },
    ],
    plugins: [
      ...getBaseRollupPlugins(),
      alias({
        entries: {
          hostConfig: `${pkgPath}/src/hostConfig.ts`
        }
      }),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: ({ name, description, version }) => ({
          name,
          description,
          version,
          peerDependencies: {
            react: version
          },
          main: "index.js",
        }),
      }),
    ],
  },
]
