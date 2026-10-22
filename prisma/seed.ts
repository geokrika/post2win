import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Έναρξη Seeding στη βάση δεδομένων...')

  // 1. Καθαρισμός υπαρχόντων δεδομένων
  await prisma.votes.deleteMany()
  await prisma.bets.deleteMany()
  await prisma.user_files.deleteMany()
  await prisma.draw_rounds.deleteMany()
  await prisma.users.deleteMany()

  // 2. Δημιουργία Χρηστών
  const creator1 = await prisma.users.create({
    data: {
      player_id: 'PLAY-ALEX-101',
      username: 'alex_beats',
      full_name: 'Alex Beats',
      email: 'alex@example.com',
      password_hash: 'mock_password_hash_123',
      wallet_balance: 150.0,
    },
  })

  const creator2 = await prisma.users.create({
    data: {
      player_id: 'PLAY-MARIA-102',
      username: 'maria_art',
      full_name: 'Maria Art',
      email: 'maria@example.com',
      password_hash: 'mock_password_hash_123',
      wallet_balance: 200.0,
    },
  })

  const voter1 = await prisma.users.create({
    data: {
      player_id: 'PLAY-JOHN-103',
      username: 'john_supporter',
      full_name: 'John Supporter',
      email: 'john@example.com',
      password_hash: 'mock_password_hash_123',
      wallet_balance: 500.0,
    },
  })

  const voter2 = await prisma.users.create({
    data: {
      player_id: 'PLAY-ELENA-104',
      username: 'elena_voter',
      full_name: 'Elena Voter',
      email: 'elena@example.com',
      password_hash: 'mock_password_hash_123',
      wallet_balance: 350.0,
    },
  })

  console.log('✅ Δημιουργήθηκαν 4 δοκιμαστικοί χρήστες.')

  // 3. Δημιουργία Ενεργού Γύρου Jackpot
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const round1 = await prisma.draw_rounds.create({
    data: {
      seed_amount: 100.0,
      current_jackpot: 100.0,
      status: 'ACTIVE',
      starts_at: now,
      ends_at: nextWeek,
    },
  })

  console.log('✅ Δημιουργήθηκε ο Γύρος του Progressive Jackpot.')

  // 4. Δημιουργία UGC Αρχείων
  const file1 = await prisma.user_files.create({
    data: {
      users: { connect: { id: creator1.id } },
      draw_rounds: { connect: { id: round1.id } },
      hash_id: 'hash_synthwave_cyber_anthem_001',
      media_type: 'AUDIO',
      file_url: 'https://example.com/audio/cyber-anthem.mp3',
      text_content: 'Synthwave Cyber Anthem - 80s Retro Track',
      display_as: 'USERNAME',
    },
  })

  const file2 = await prisma.user_files.create({
    data: {
      users: { connect: { id: creator2.id } },
      draw_rounds: { connect: { id: round1.id } },
      hash_id: 'hash_neon_samurai_art_002',
      media_type: 'IMAGE',
      file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
      text_content: 'Neon Samurai Concept Art',
      display_as: 'FULL_NAME',
    },
  })

  console.log('✅ Δημιουργήθηκαν 2 UGC αρχεία περιεχομένου.')

  // 5. Καταχώριση Δοκιμαστικών Ψήφων
  await prisma.votes.create({
    data: {
      users: { connect: { id: voter1.id } },
      user_files: { connect: { id: file1.id } },
      amount: 10.0,
      tickets_earned: BigInt(2000),
    },
  })

  await prisma.votes.create({
    data: {
      users: { connect: { id: voter2.id } },
      user_files: { connect: { id: file2.id } },
      amount: 20.0,
      tickets_earned: BigInt(4000),
    },
  })

  // Ενημέρωση Jackpot Pool
  await prisma.draw_rounds.update({
    where: { id: round1.id },
    data: { current_jackpot: 127.0 },
  })

  console.log('✅ Προστέθηκαν δοκιμαστικές ψήφοι & ενημερώθηκε το Progressive Jackpot σε 127.00€.')
  console.log('🎉 Το Seeding ολοκληρώθηκε με επιτυχία!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Σφάλμα κατά το Seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })