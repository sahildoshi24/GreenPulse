-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "machineType" TEXT NOT NULL,
    "ratedPowerKw" REAL NOT NULL,
    "temperatureC" REAL NOT NULL,
    "vibrationMmS" REAL NOT NULL,
    "rpm" INTEGER NOT NULL,
    "voltage" REAL NOT NULL,
    "current" REAL NOT NULL,
    "ageYears" INTEGER NOT NULL,
    "dailyOperatingHours" REAL NOT NULL,
    "maintenanceCondition" TEXT NOT NULL,
    "efficiencyLossPct" REAL NOT NULL,
    "energyWasteKwh" REAL NOT NULL,
    "carbonEmissionKgCo2e" REAL NOT NULL,
    "failureRiskPct" REAL NOT NULL,
    "greenHealthScore" TEXT NOT NULL,
    "insightsJson" TEXT NOT NULL,
    "alertsJson" TEXT NOT NULL,
    "contributionsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Machine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
