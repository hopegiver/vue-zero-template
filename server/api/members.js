import { Hono } from 'hono'
import MembersDao from '../dao/members.js'

const router = new Hono()

router.get('/', (c) => {
  const dao = new MembersDao(c.env)
  return c.json({ members: dao.findAll() })
})

export default router
