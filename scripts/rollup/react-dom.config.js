import { resolvePkgPath, getPackageJSON, getBaseRollupPlugins } from "./utils"
import generatePackageJson from "rollup-plugin-generate-package-json"
import alias from "@rollup/plugin-alias"

const { name, module, peerDependencies } = getPackageJSON("react-dom")
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
        name: "ReactDOM",
        format: "umd",
      },
      {
        file: `${pkgDistPath}/client.js`,
        name: "client",
        format: "umd",
      },
    ],
    external: [...Object.keys(peerDependencies)],
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
  {
    input: `${pkgPath}/test-utils.ts`, // 入口文件
    output: [
      {
        file: `${pkgDistPath}/test-utils.js`,
        name: "testUtils.js",
        format: "umd",
      }
    ],
    external: ['react-dom', 'react'],
    plugins: getBaseRollupPlugins()
  },
]
