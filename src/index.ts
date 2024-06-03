import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { html } from 'hono/html'
import type { FrameSignaturePacket } from './types'
import { TokenData, TokenBalance, UsernameProofData } from './types'
import { ethers } from "ethers";
import 'dotenv/config'

const app = new Hono()

const providerURL: string = process.env.QUICKNODE_HTTP_ENDPOINT as string
const coingeckoApiKey: string = process.env.COINGECKO_API_KEY as string

async function getWalletLinkTokenBalances(walletAddress: string): Promise<TokenBalance | null> {
  const response = await fetch(providerURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "qn_getWalletTokenBalance",
      params: [{ wallet: walletAddress, contracts: ['0x779877A7B0D9E8603169DdbD7836e478b4624789'] }]
    })
  });

  const data = await response.json()

  if (data && data.result && data.result.result) {

    const token = data.result.result[0]
    const tokenBalance: TokenBalance = {
      name: token.name,
      address: token.address,
      totalBalance: token.totalBalance,
      decimals: token.decimals
    }
    return tokenBalance
  }

  return null
}

async function getWalletAddressfromfId(fid: number): Promise<string> {
  try {
    const proofUrl = `https://hub.pinata.cloud/v1/userNameProofsByFid?fid=${fid}`
    const usernameProofResponse = await fetch(proofUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json'
      },
    })

    const usernameProofData: UsernameProofData[] = (await usernameProofResponse.json())['proofs']
    if (!usernameProofData) {
      throw new Error("No username proof found")
    }

    return usernameProofData[0]?.owner
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

async function getLinkTokenBalancesInUsd(token: TokenBalance): Promise<(TokenData | null)> {

  try {
    const coinInfoEndpoint = `https://api.coingecko.com/api/v3/simple/price?x_cg_demo_api_key=${coingeckoApiKey}&ids=chainlink&vs_currencies=usd`

    const response = await fetch(coinInfoEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return {
      name: 'chainlink',
      usdValue: data['chainlink'].usd * parseFloat(ethers.formatUnits(token.totalBalance, Number(token.decimals)))
    }
  } catch (error) {
    console.error('Error fetching token price:', error);
    return null;
  }
}

app.get('/', (c) => {
  const framePostUrl = c.req.url
  const frameImage = `https://placehold.co/1920x1005@2x.png?text=Calculate Your LINK balance in USD`
  return c.html(html`
    <html lang="en">
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="og:image" content="${frameImage}" />
        <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
        <meta property="fc:frame:image" content="${frameImage}" />
        <meta property="fc:frame:post_url" content="${framePostUrl}" />
        <meta property="fc:frame:button:1" content="Calculate Your LINK Balance in USD" />
        <title>Calculate Your LINK Balance in USD</title>
      </head>
    </html>
  `)
})

app.post('/', async (c) => {
  
  try {
    const framePostUrl = c.req.url

    const body = await c.req.json<FrameSignaturePacket>()
    const fid = body.untrustedData.fid

    const walletAddress = await getWalletAddressfromfId(fid)
    const tokenBalance = await getWalletLinkTokenBalances(walletAddress)
    const linkBalanceTokenData: (TokenData | null) = (await getLinkTokenBalancesInUsd(tokenBalance!))
    
    const borrowImage = `https://placehold.co/1920x1005@2x.png?text=Your LINK in USD = ${linkBalanceTokenData!.usdValue}`

    return c.html(html`
      <html lang="en">
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${borrowImage}" />
          <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
          <meta property="fc:frame:button:1:post" content="${framePostUrl}" />
          <meta property="fc:frame:button:1" content="Recalculate" />
          <title>LINK USD Value Calculator</title>
        </head>
      </html>
    `)
   } catch (error) {
    console.error(error)
    return c.json({ error: 'Invalid request' }, 400)
  }
})

const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})