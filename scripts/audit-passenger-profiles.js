const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { prisma } = require(path.join(__dirname, '../backend/dist/core/database/prisma'));

async function runAudit() {
  console.log('=== KINGS TAXI PASSENGER PROFILE AUDIT ===');
  try {
    const total = await prisma.passenger.count();
    console.log(`Total passenger accounts: ${total}`);

    const passengers = await prisma.passenger.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('\n--- Passenger Profile Records ---');
    const urlMap = new Map();
    let withImage = 0;
    let withoutImage = 0;

    for (const p of passengers) {
      const maskedPhone = p.phoneNumber ? p.phoneNumber.slice(0, 4) + '***' + p.phoneNumber.slice(-2) : 'none';
      const maskedEmail = p.email ? p.email[0] + '***@' + p.email.split('@')[1] : 'none';
      console.log(`Passenger [${p.id}] "${p.fullName}" (Email: ${maskedEmail}, Phone: ${maskedPhone})`);
      console.log(`  Profile Image: ${p.profileImage || 'NULL'}`);

      if (p.profileImage) {
        withImage++;
        const count = (urlMap.get(p.profileImage) || 0) + 1;
        urlMap.set(p.profileImage, count);
      } else {
        withoutImage++;
      }
    }

    console.log(`\nSummary: ${withImage} passengers with image, ${withoutImage} without image.`);

    console.log('\n--- Shared / Duplicate Profile Image URLs ---');
    let duplicatesFound = false;
    for (const [url, count] of urlMap.entries()) {
      if (count > 1) {
        duplicatesFound = true;
        console.warn(`WARNING: URL shared across ${count} passengers: ${url}`);
      }
    }

    if (!duplicatesFound) {
      console.log('No duplicate or shared profile image URLs found in database.');
    }
  } catch (err) {
    console.error('Audit Error (DB offline or connection failed):', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
