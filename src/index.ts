import { Lema, PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

interface IDictResponse {
  status: boolean
  message: string
  data: Lema[]
}

async function getRandomWord(recursion = 0): Promise<string> {
  const file = fs.readFileSync('daftar_kata.txt')
  const wordList = file.toString().split('\n')
  const randomIndex = Math.floor(Math.random() * wordList.length)
  const randomWord = wordList[randomIndex];
  const existingData = await prisma.word.findFirst({ where: { kata: randomWord } })

  if (existingData != null) {
    if (recursion < 15) {
      wordList.splice(randomIndex, 1)
      fs.writeFileSync('daftar_kata.txt', wordList.join('\n'))
      console.log(`word ${randomWord} removed from list, ${wordList.length} word to go`)
      return getRandomWord(recursion + 1)
    } else {
      throw Error("Failed to get unique random word!. Too much recursion")
    }
  }
  return randomWord
}

async function main() {
  try {
    await prisma.$connect()

    const randomWord = await getRandomWord()
    const apiUrl = process.env.API_URL
    const response = await fetch(`${apiUrl}/cari/${randomWord}`)

    if (!response.ok) throw Error(`Failed to fetch dictionary from api for word: ${randomWord}`)

    const jsonData: IDictResponse = await response.json()
    await prisma.word.create({
      data: {
        kata: randomWord,
        data: jsonData.data
      }
    })
  }
  catch (e) {
    console.error(e)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

