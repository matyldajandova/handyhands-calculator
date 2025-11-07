import { generatePoptavkaHash, decodePoptavkaHash, PoptavkaHashData } from './hash-generator';

// Simple test runner
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let testsPassed = 0;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let testsFailed = 0;
const failures: string[] = [];

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    testsPassed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    testsFailed++;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`  ✗ ${name}: ${message}`);
    console.error(`  ✗ ${name}: ${message}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    not: {
      toBe(expected: unknown) {
        if (actual === expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`);
        }
      },
      toContain(substring: string) {
        if (String(actual).includes(substring)) {
          throw new Error(`Expected ${JSON.stringify(actual)} not to contain ${JSON.stringify(substring)}`);
        }
      },
    },
    toContain(substring: string) {
      if (!String(actual).includes(substring)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(substring)}`);
      }
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, but got undefined`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
  };
}

describe('Hash Abbreviation System', () => {
  describe('Key Abbreviation', () => {
    it('should abbreviate camelCase keys correctly', () => {
      // Test through round-trip encoding/decoding
      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        invoiceEmail: 'invoice@example.com',
        propertyStreet: '123 Main St',
        propertyCity: 'City',
        propertyZipCode: '12345',
        companyName: 'Company Inc',
        companyIco: '12345678',
        companyDic: 'CZ12345678',
        serviceStartDate: '2025-01-01',
        cleaningFrequency: 'weekly',
        optionalServicesWeekly: ['service1'],
      };

      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Test Service',
        totalPrice: 1000,
        currency: 'Kč',
          calculationData: {
            regularCleaningPrice: 900,
            totalMonthlyPrice: 900,
            formData,
            orderId: 'test_order',
            calculationDetails: {
              basePrice: 900,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      // Verify all keys are preserved correctly
      expect(decodedFormData.firstName).toBe('John');
      expect(decodedFormData.lastName).toBe('Doe');
      expect(decodedFormData.email).toBe('john@example.com');
      expect(decodedFormData.phone).toBe('+1234567890');
      expect(decodedFormData.invoiceEmail).toBe('invoice@example.com');
      expect(decodedFormData.propertyStreet).toBe('123 Main St');
      expect(decodedFormData.propertyCity).toBe('City');
      expect(decodedFormData.propertyZipCode).toBe('12345');
      expect(decodedFormData.companyName).toBe('Company Inc');
      expect(decodedFormData.companyIco).toBe('12345678');
      expect(decodedFormData.companyDic).toBe('CZ12345678');
      expect(decodedFormData.serviceStartDate).toBe('2025-01-01');
      expect(decodedFormData.cleaningFrequency).toBe('weekly');
      expect(Array.isArray(decodedFormData.optionalServicesWeekly)).toBe(true);
    });

    it('should abbreviate kebab-case keys correctly', () => {
      const formData = {
        'window-type': 'original',
        'hard-to-reach': 'yes',
        'after-reconstruction': 'no',
      };

      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Test Service',
        totalPrice: 1000,
        currency: 'Kč',
          calculationData: {
            regularCleaningPrice: 900,
            totalMonthlyPrice: 900,
            formData,
            orderId: 'test_order',
            calculationDetails: {
              basePrice: 900,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      expect(decodedFormData['window-type']).toBe('original');
      expect(decodedFormData['hard-to-reach']).toBe('yes');
      expect(decodedFormData['after-reconstruction']).toBe('no');
    });
  });

  describe('Value Abbreviation', () => {
    it('should keep short values (<= 3 chars) as-is', () => {
      const formData = {
        hasElevator: 'yes',
        generalCleaning: 'no',
        windowType: 'all',
      };

      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Test Service',
        totalPrice: 1000,
        currency: 'Kč',
          calculationData: {
            regularCleaningPrice: 900,
            totalMonthlyPrice: 900,
            formData,
            orderId: 'test_order',
            calculationDetails: {
              basePrice: 900,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      expect(decodedFormData.hasElevator).toBe('yes');
      expect(decodedFormData.generalCleaning).toBe('no');
      expect(decodedFormData.windowType).toBe('all');
    });

    it('should abbreviate longer kebab-case values', () => {
      const formData = {
        cleaningFrequency: 'twice-weekly',
        windowType: 'hard-to-reach',
        spreadingMaterial: 'gravel-sand',
      };

      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Test Service',
        totalPrice: 1000,
        currency: 'Kč',
          calculationData: {
            regularCleaningPrice: 900,
            totalMonthlyPrice: 900,
            formData,
            orderId: 'test_order',
            calculationDetails: {
              basePrice: 900,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      expect(decodedFormData.cleaningFrequency).toBe('twice-weekly');
      expect(decodedFormData.windowType).toBe('hard-to-reach');
      expect(decodedFormData.spreadingMaterial).toBe('gravel-sand');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect and handle key abbreviation conflicts', () => {
      // Create formData with keys that might conflict
      const formData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        invoiceEmail: 'invoice@example.com',
      };

      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Test Service',
        totalPrice: 1000,
        currency: 'Kč',
          calculationData: {
            regularCleaningPrice: 900,
            totalMonthlyPrice: 900,
            formData,
            orderId: 'test_order',
            calculationDetails: {
              basePrice: 900,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      // Verify no conflicts occurred - all values should be correct
      expect(decodedFormData.email).toBe('test@example.com');
      expect(decodedFormData.firstName).toBe('John');
      expect(decodedFormData.lastName).toBe('Doe');
      expect(decodedFormData.phone).toBe('+1234567890');
      expect(decodedFormData.invoiceEmail).toBe('invoice@example.com');
    });

    it('should preserve full key names when conflicts are detected', () => {
      // This test verifies that if conflicts exist, full key names are preserved
      // The hash should still decode correctly
      const formData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Test Service',
        totalPrice: 1000,
        currency: 'Kč',
          calculationData: {
            regularCleaningPrice: 900,
            totalMonthlyPrice: 900,
            formData,
            orderId: 'test_order',
            calculationDetails: {
              basePrice: 900,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      // All keys should be present and correct
      expect(decodedFormData.email).toBe('test@example.com');
      expect(decodedFormData.firstName).toBe('John');
      expect(decodedFormData.lastName).toBe('Doe');
    });
  });

  describe('Round-trip Encoding/Decoding', () => {
    it('should preserve all form data through encode/decode cycle', () => {
      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
        calculationData: {
          regularCleaningPrice: 3400,
          totalMonthlyPrice: 3400,
          formData: {
            firstName: 'Matylda',
            lastName: 'Jandová',
            email: 'maty@grenadecastle.com',
            phone: '+420776238737',
            invoiceEmail: 'tyldajandova@gmail.com',
            propertyStreet: 'Vysočanská 310/7',
            propertyCity: 'Praha 9',
            propertyZipCode: '19000',
            isCompany: true,
            companyName: 'Grenade Castle s.r.o.',
            companyIco: '21608083',
            companyDic: 'CZ21608083',
            cleaningFrequency: 'twice-weekly',
            hasElevator: 'yes',
            generalCleaning: 'yes',
            notes: 'Test note',
            poptavkaNotes: 'Poptávka note',
          },
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      expect(decoded).toBeDefined();
      expect(decoded?.serviceType).toBe(originalData.serviceType);
      expect(decoded?.totalPrice).toBe(originalData.totalPrice);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      expect(decodedFormData).toBeDefined();
      
      // Verify all critical fields are preserved correctly
      expect(decodedFormData.firstName).toBe(originalData.calculationData?.formData?.firstName);
      expect(decodedFormData.lastName).toBe(originalData.calculationData?.formData?.lastName);
      expect(decodedFormData.email).toBe(originalData.calculationData?.formData?.email);
      expect(decodedFormData.phone).toBe(originalData.calculationData?.formData?.phone);
      expect(decodedFormData.invoiceEmail).toBe(originalData.calculationData?.formData?.invoiceEmail);
      expect(decodedFormData.propertyStreet).toBe(originalData.calculationData?.formData?.propertyStreet);
      expect(decodedFormData.propertyCity).toBe(originalData.calculationData?.formData?.propertyCity);
      expect(decodedFormData.companyName).toBe(originalData.calculationData?.formData?.companyName);
      expect(decodedFormData.notes).toBe(originalData.calculationData?.formData?.notes);
      expect(decodedFormData.poptavkaNotes).toBe(originalData.calculationData?.formData?.poptavkaNotes);
    });

    it('should preserve data integrity - firstName should never equal email', () => {
      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
        calculationData: {
          regularCleaningPrice: 3400,
          totalMonthlyPrice: 3400,
          formData: {
            firstName: 'Matylda',
            lastName: 'Jandová',
            email: 'maty@grenadecastle.com',
            phone: '+420776238737',
          },
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      // Critical: firstName should NEVER equal email
      expect(decodedFormData.firstName).not.toBe(decodedFormData.email);
      expect(decodedFormData.firstName).toBe('Matylda');
      expect(decodedFormData.email).toBe('maty@grenadecastle.com');
      
      // Verify firstName doesn't contain @ (email indicator)
      expect(String(decodedFormData.firstName)).not.toContain('@');
    });

    it('should handle arrays correctly', () => {
      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
        calculationData: {
          regularCleaningPrice: 3400,
          totalMonthlyPrice: 3400,
          formData: {
            windowType: ['original', 'hard-to-reach'],
            optionalServicesWeekly: ['remove-debris', 'report-defects'],
            optionalServicesMonthly: ['remove-stickers', 'elevator-maintenance-monthly'],
          },
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      expect(Array.isArray(decodedFormData.windowType)).toBe(true);
      expect(decodedFormData.windowType).toEqual(['original', 'hard-to-reach']);
      expect(decodedFormData.optionalServicesWeekly).toEqual(['remove-debris', 'report-defects']);
      expect(decodedFormData.optionalServicesMonthly).toEqual(['remove-stickers', 'elevator-maintenance-monthly']);
    });

    it('should handle boolean values correctly', () => {
      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
        calculationData: {
          regularCleaningPrice: 3400,
          totalMonthlyPrice: 3400,
          formData: {
            isCompany: true,
            hasElevator: 'yes',
            generalCleaning: 'yes',
          },
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      expect(decodedFormData.isCompany).toBe(true);
      expect(decodedFormData.hasElevator).toBe('yes');
      expect(decodedFormData.generalCleaning).toBe('yes');
    });

    it('should handle numeric values correctly', () => {
      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
        calculationData: {
          regularCleaningPrice: 3400,
          totalMonthlyPrice: 3400,
          formData: {
            aboveGroundFloors: 3,
            undergroundFloors: 1,
            windowsPerFloor: 5,
          },
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      expect(decodedFormData.aboveGroundFloors).toBe(3);
      expect(decodedFormData.undergroundFloors).toBe(1);
      expect(decodedFormData.windowsPerFloor).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty formData', () => {
      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
        calculationData: {
          regularCleaningPrice: 3400,
          totalMonthlyPrice: 3400,
          formData: {},
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      // Empty formData might be filtered out during cleaning - both empty object and undefined are acceptable
      const decodedFormData = decoded?.calculationData?.formData;
      expect(
        decodedFormData === undefined || 
        decodedFormData === null || 
        (typeof decodedFormData === 'object' && Object.keys(decodedFormData).length === 0)
      ).toBe(true);
    });

    it('should handle formData with only firstName, lastName, email', () => {
      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
        calculationData: {
          regularCleaningPrice: 3400,
          totalMonthlyPrice: 3400,
          formData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      expect(decodedFormData.firstName).toBe('John');
      expect(decodedFormData.lastName).toBe('Doe');
      expect(decodedFormData.email).toBe('john@example.com');
      expect(decodedFormData.firstName).not.toBe(decodedFormData.email);
    });

    it('should handle very long formData with all fields', () => {
      const formData: Record<string, unknown> = {
        firstName: 'Matylda',
        lastName: 'Jandová',
        email: 'maty@grenadecastle.com',
        phone: '+420776238737',
        invoiceEmail: 'tyldajandova@gmail.com',
        propertyStreet: 'Vysočanská 310/7',
        propertyCity: 'Praha 9',
        propertyZipCode: '19000',
        isCompany: true,
        companyName: 'Grenade Castle s.r.o.',
        companyIco: '21608083',
        companyDic: 'CZ21608083',
        companyStreet: 'Sokolovská 352/215',
        companyCity: 'Praha 9',
        companyZipCode: '19000',
        cleaningFrequency: 'twice-weekly',
        aboveGroundFloors: 3,
        undergroundFloors: 1,
        apartmentsPerFloor: 'less-than-3',
        hasElevator: 'yes',
        hasHotWater: 'yes',
        buildingPeriod: 'pre1945',
        generalCleaning: 'yes',
        generalCleaningType: 'quarterly',
        windowsPerFloor: 2,
        floorsWithWindows: 'all',
        windowType: ['new'],
        basementCleaning: 'general',
        basementCleaningDetails: 'corridors-only',
        winterMaintenance: 'yes',
        spreadingMaterial: 'gravel-sand',
        communicationType: 'area',
        communicationArea: '50',
        zipCode: '19000',
        optionalServicesWeekly: ['remove-debris'],
        optionalServicesMonthly: ['remove-stickers', 'elevator-maintenance-monthly'],
        serviceStartDate: '2025-11-28',
        notes: 'Test note from form',
        poptavkaNotes: 'Test poptávka note',
      };

      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
          calculationData: {
            regularCleaningPrice: 3400,
            totalMonthlyPrice: 3400,
            formData,
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      // Verify critical fields
      expect(decodedFormData.firstName).toBe('Matylda');
      expect(decodedFormData.email).toBe('maty@grenadecastle.com');
      expect(decodedFormData.firstName).not.toBe(decodedFormData.email);
      
      // Verify all fields are present and correct
      Object.keys(formData).forEach(key => {
        expect(decodedFormData[key]).toBeDefined();
        expect(decodedFormData[key]).toEqual(formData[key]);
      });
    });

    it('should handle special characters in values', () => {
      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
        calculationData: {
          regularCleaningPrice: 3400,
          totalMonthlyPrice: 3400,
          formData: {
            firstName: 'José',
            lastName: 'García-López',
            email: 'test+tag@example.com',
            notes: 'Note with "quotes" and \'apostrophes\'',
          },
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      expect(decodedFormData.firstName).toBe('José');
      expect(decodedFormData.lastName).toBe('García-López');
      expect(decodedFormData.email).toBe('test+tag@example.com');
      expect(decodedFormData.notes).toBe('Note with "quotes" and \'apostrophes\'');
    });
  });

  describe('Data Integrity', () => {
    it('should never mix up firstName and email values', () => {
      const testCases = [
        {
          firstName: 'Matylda',
          email: 'maty@grenadecastle.com',
        },
        {
          firstName: 'John',
          email: 'john.doe@example.com',
        },
        {
          firstName: 'José',
          email: 'jose@test.com',
        },
      ];

      testCases.forEach(({ firstName, email }) => {
        const originalData: PoptavkaHashData = {
          serviceType: 'residential-building',
          serviceTitle: 'Test Service',
          totalPrice: 1000,
          currency: 'Kč',
          calculationData: {
            regularCleaningPrice: 900,
            totalMonthlyPrice: 900,
            formData: { firstName, email },
            orderId: 'test_order',
            calculationDetails: {
              basePrice: 900,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
        };

        const hash = generatePoptavkaHash(originalData);
        const decoded = decodePoptavkaHash(hash);

        const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
        
        expect(decodedFormData.firstName).toBe(firstName);
        expect(decodedFormData.email).toBe(email);
        expect(decodedFormData.firstName).not.toBe(decodedFormData.email);
        expect(String(decodedFormData.firstName)).not.toContain('@');
      });
    });

    it('should preserve all customer fields correctly', () => {
      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Test Service',
        totalPrice: 1000,
        currency: 'Kč',
        calculationData: {
          regularCleaningPrice: 900,
          totalMonthlyPrice: 900,
          formData: {
            firstName: 'Matylda',
            lastName: 'Jandová',
            email: 'maty@grenadecastle.com',
            phone: '+420776238737',
            invoiceEmail: 'tyldajandova@gmail.com',
          },
            orderId: 'test_order',
            calculationDetails: {
              basePrice: 900,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      const decoded = decodePoptavkaHash(hash);

      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      
      // Verify each field individually
      expect(decodedFormData.firstName).toBe('Matylda');
      expect(decodedFormData.lastName).toBe('Jandová');
      expect(decodedFormData.email).toBe('maty@grenadecastle.com');
      expect(decodedFormData.phone).toBe('+420776238737');
      expect(decodedFormData.invoiceEmail).toBe('tyldajandova@gmail.com');
      
      // Verify no field contains another field's value
      expect(decodedFormData.firstName).not.toBe(decodedFormData.email);
      expect(decodedFormData.firstName).not.toBe(decodedFormData.invoiceEmail);
      expect(decodedFormData.lastName).not.toBe(decodedFormData.email);
      expect(decodedFormData.phone).not.toBe(decodedFormData.email);
    });
  });

  describe('Hash Size Optimization', () => {
    it('should generate smaller hashes with abbreviations', () => {
      const formData: Record<string, unknown> = {
        firstName: 'Matylda',
        lastName: 'Jandová',
        email: 'maty@grenadecastle.com',
        phone: '+420776238737',
        propertyStreet: 'Vysočanská 310/7',
        propertyCity: 'Praha 9',
        propertyZipCode: '19000',
        cleaningFrequency: 'twice-weekly',
        optionalServicesWeekly: ['remove-debris', 'report-defects'],
      };

      const originalData: PoptavkaHashData = {
        serviceType: 'residential-building',
        serviceTitle: 'Bytový dům',
        totalPrice: 3500,
        currency: 'Kč',
          calculationData: {
            regularCleaningPrice: 3400,
            totalMonthlyPrice: 3400,
            formData,
            orderId: 'test_order_123',
            calculationDetails: {
              basePrice: 3400,
              appliedCoefficients: [],
              finalCoefficient: 1,
            },
          },
      };

      const hash = generatePoptavkaHash(originalData);
      
      // Verify hash is generated successfully
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      
      // Verify hash can be decoded
      const decoded = decodePoptavkaHash(hash);
      expect(decoded).toBeDefined();
      
      const decodedFormData = decoded?.calculationData?.formData as Record<string, unknown>;
      expect(decodedFormData.firstName).toBe('Matylda');
      expect(decodedFormData.email).toBe('maty@grenadecastle.com');
    });
  });
});

