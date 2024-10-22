const Nurond = require('nurond')
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
class Nuron {
  constructor(configPath) {
    this.configPath = path.resolve(configPath)
    try {
      const configStr = fs.readFileSync(this.configPath, "utf8")
      this.config = JSON.parse(configStr)
    } catch (e) {
      this.config = {}
    }
    this.root = (this.config.root ? this.config.root : process.cwd())
    this.secret = this.config.secret
    this.admins = (this.config.admins ? this.config.admins : [])
    this.tokens = (this.config.tokens ? this.config.tokens : [])
  }
  async launch() {
    const nuronHome = path.resolve(this.root, "__nuron__/home")
    const nuronTmp = path.resolve(this.root, "__nuron__/tmp")
    const keyportHome = path.resolve(this.root, "__nuron__/keryport")
    this.nuron = new Nurond();
    await fs.promises.mkdir(nuronHome, { recursive: true }).catch((e) => {})
    await fs.promises.mkdir(nuronTmp, { recursive: true }).catch((e) => {})
    await this.nuron.init({
      ipfs: {},
      path: nuronHome,
      tmp: nuronTmp,
      keyport: keyportHome,
      admins: this.admins,
      secret: this.secret,
      beforeInit: (party) => {
        // admin should be able to access everything
        party.add("admin", {
          authorize: async (req, account) => {
            // only allow admins to use
            if (this.admins && this.admins.length > 0) {
              for(let admin of this.admins) {
                if (account === admin.toLowerCase()) {
                  return { authorized: true }
                }
              }
              throw new Error("not an admin account")
            } else {
              return { authorized: true }
            }
          }
        })
        party.add("api", {
          authorize: async (req, account) => {
            // only allow admins to use
            if (this.admins && this.admins.length > 0) {
              for(let admin of this.admins) {
                console.log("account", account)
                if (account === admin.toLowerCase()) {
                  return { authorized: true }
                }
              }
              throw new Error("not an admin account")
            } else {
              return { authorized: true }
            }
          }
        })
        party.app.use("/fs", party.protect(["api", "admin"], { json: { error: "unauthorized" } }))
        party.app.use("/db", party.protect(["api", "admin"], { json: { error: "unauthorized" } }))
        party.app.use("/raw", party.protect(["api", "admin"], { json: { error: "unauthorized" } }))
        party.app.use("/token", party.protect(["api", "admin"], { json: { error: "unauthorized" } }))
        party.app.use("/wallet", party.protect(["api", "admin"], { json: { error: "unauthorized" } }))
        party.app.use("/web", party.protect(["api", "admin"], { json: { error: "unauthorized" } }))

        party.app.use("/install", party.protect("admin"))
        party.app.use("/apps", party.protect("admin"))
        party.app.use("/settings", party.protect("admin"))
        party.app.use("/wallets", party.protect("admin"))

        party.app.post("/nuron/admin/shutdown", party.protect("admin"), async (req, res) => {
          res.json({})
          process.exit(1)
        })
        party.app.post("/nuron/admin/update", party.protect("admin"), async (req, res) => {
          console.log("update", req.body)
          await fs.promises.writeFile(this.configPath, JSON.stringify(req.body, null, 2))
          res.json({})
        })
        party.app.get("/nuron/admin", party.protect("admin"), async (req, res) => {
          let config = {}
          if (this.admins) config.admins = this.admins.join("\n")
          if (this.tokens) config.tokens = this.tokens.join("\n")
          if (this.secret) config.secret = this.secret
          let html = await ejs.renderFile(path.resolve(__dirname, "view", "admin.html"), config, { async: true })
          res.setHeader("Content-Type", "text/html").send(html)
        })        
        party.app.use("/contracts", party.express.static(path.join(__dirname, "view", "contracts")))
        party.app.get("/", party.protect("admin"), async (req, res) => {
          console.log("GET /" )
          let key = this.nuron.core.wallet.key()
          if (key) {
            res.render(path.resolve(__dirname, "view", "home"), {
              name: this.nuron.core.wallet.name(),
              chainId: req.params.chainId,
            })
          } else {
            let wallets = await this.nuron.core.wallet.get()
            console.log("Wallets", wallets)
            res.render(path.resolve(__dirname, "view", "loggedout"), { wallets })
          }
        })
      }
    })
    this.privateparty = this.nuron.party
  }
}
module.exports = Nuron
