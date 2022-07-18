const { createAvatar } = require('@dicebear/avatars');
const style = require('@dicebear/open-peeps');
const Nuron = require('nuronjs')
const nuron = new Nuron({
  nuron: {{nuron}},
  token: {{token}},
  key: "m'/44'/60'/0'/0/0",
  workspace: "hello cell",
  domain: {{domain}}
});
(async () => {
  await nuron.configure({ ipfs: { key: {{NFTSTORAGE}} } })
  await nuron.fs.rm("*")
  await nuron.db.rm("token", {})
  for(let i=0; i<10; i++) {
    let svg = createAvatar(style, { seed: i.toString() });
    let svg_cid = await nuron.fs.write(Buffer.from(svg))
    let metadata_cid = await nuron.fs.write({
      name: `${i}`,
      description: `${i}.svg`,
      image: `ipfs://${svg_cid}`,
      mime: { [svg_cid]: "image/svg+xml" }
    })
    let token = await nuron.token.create({ cid: metadata_cid })
    await nuron.db.write("token", token)
    await nuron.fs.write(token)
    await nuron.fs.pin(svg_cid)
    await nuron.fs.pin(metadata_cid)
    console.log(`[${i}] created token`, token)
  }
  await nuron.web.build()
  console.log("finished")
})();
