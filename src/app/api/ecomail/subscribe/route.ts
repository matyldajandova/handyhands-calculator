import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

const ECOMail_API_KEY = process.env.ECOMAIL_API_KEY;
const ECOMail_API_URL = process.env.ECOMAIL_API_URL;

interface CustomerData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  serviceStartDate?: string;
  invoiceEmail?: string;
  notes?: string;
  pdfUrl?: string;
  poptavkaUrl?: string; // URL to poptavka page with hash
  serviceType?: string; // Service type ID (e.g., "office-cleaning", "panel-building")
  serviceTitle?: string; // Service type title for reference
  // Company data
  isCompany?: boolean;
  companyName?: string;
  companyIco?: string;
  companyDic?: string;
  companyStreet?: string;
  companyCity?: string;
  companyZipCode?: string;
  // Property data
  propertyStreet?: string;
  propertyCity?: string;
  propertyZipCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/ecomail/subscribe');
    
    const customerData: CustomerData = await request.json();

    // Debug logging for Vercel
    logger.info('Ecomail API Key exists:', !!ECOMail_API_KEY, { prefix: 'ECOMAIL' });
    logger.info('Ecomail API URL:', ECOMail_API_URL, { prefix: 'ECOMAIL' });
    logger.info('Customer data received:', {
      email: customerData.email,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      hasServiceStartDate: !!customerData.serviceStartDate,
      hasPdfUrl: !!customerData.pdfUrl,
      pdfUrl: customerData.pdfUrl || 'NOT PROVIDED',
      hasPoptavkaUrl: !!customerData.poptavkaUrl,
      poptavkaUrl: customerData.poptavkaUrl || 'NOT PROVIDED',
      serviceType: customerData.serviceType || 'NOT PROVIDED'
    }, { prefix: 'ECOMAIL' });

    // Validate API key
    if (!ECOMail_API_KEY) {
      logger.error('Ecomail API key not configured', undefined, { prefix: 'ECOMAIL' });
      return NextResponse.json(
        { error: 'Ecomail API key not configured' },
        { status: 500 }
      );
    }

    // Validate API URL
    if (!ECOMail_API_URL) {
      logger.error('Ecomail API URL not configured', undefined, { prefix: 'ECOMAIL' });
      return NextResponse.json(
        { error: 'Ecomail API URL not configured' },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!customerData.email || !customerData.firstName || !customerData.lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, firstName, lastName' },
        { status: 400 }
      );
    }

    // Determine label based on the request source
    // If serviceStartDate is present, it's from poptavka submission
    // Otherwise, it's from PDF download
    const label = customerData.serviceStartDate ? 'Kalkulátor nabídka' : 'PDF';
    
    // Map service type IDs to tags for segmentation
    const getServiceTag = (serviceType: string): string | null => {
      const serviceTypeMap: Record<string, string> = {
        'office-cleaning': 'Kanceláře',
        'panel-building': 'Panelové domy',
        'residential-building': 'Činžovní domy',
        'commercial-spaces': 'Komerční prostory',
        'home-cleaning': 'Domácnosti',
        'one-time-cleaning': 'Jednorázový úklid',
        'handyman-services': 'Mytí oken a ostatní služby'
      };
      
      return serviceTypeMap[serviceType] || null;
    };
    
    // Build tags array
    const tags: string[] = [label];
    
    // Add service type tag if available (for both PDF and Kalkulátor nabídka)
    if (customerData.serviceType) {
      const serviceTag = getServiceTag(customerData.serviceType);
      if (serviceTag) {
        tags.push(serviceTag);
      }
    }

    // Prepare custom fields data based on the merge tags from the image
    const pdfUrlValue = customerData.pdfUrl || '';
    logger.info('Setting PDF_OBJEDNAVKA custom field:', {
      hasPdfUrl: !!customerData.pdfUrl,
      pdfUrlValue: pdfUrlValue || 'EMPTY - PDF may not have been uploaded to Google Drive',
      pdfUrlLength: pdfUrlValue.length
    }, { prefix: 'ECOMAIL' });
    
    const customFields = {
      'START_UKLIDU': {
        value: customerData.serviceStartDate || '',
        type: 'date'
      },
      'POZNAMKA': {
        value: customerData.notes || '',
        type: 'string'
      },
      'PDF_OBJEDNAVKA': {
        value: pdfUrlValue,
        type: 'url'
      },
      'FAKTURACNI_PSC': {
        value: customerData.companyZipCode || customerData.propertyZipCode || '',
        type: 'string'
      },
      'FAKTURACNI_MESTO': {
        value: customerData.companyCity || customerData.propertyCity || '',
        type: 'string'
      },
      'FAKTURACNI_EMAIL': {
        value: customerData.invoiceEmail || customerData.email,
        type: 'string'
      },
      'FAKTURACNI_ADRESA': {
        value: customerData.companyStreet || customerData.propertyStreet || '',
        type: 'string'
      },
      'POPTAVKA_URL': {
        value: customerData.poptavkaUrl || '',
        type: 'url'
      }
    };

    // Prepare subscriber data for Ecomail
    const subscriberData = {
      subscriber_data: {
        name: customerData.firstName,
        surname: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone || '',
        company: customerData.isCompany ? customerData.companyName : '',
        street: customerData.propertyStreet || '',
        city: customerData.propertyCity || '',
        zip: customerData.propertyZipCode || '',
        country: 'CZ',
        custom_fields: customFields,
        tags: tags // Add tags to differentiate PDF vs Poptávka and service types
      },
      trigger_autoresponders: false,
      update_existing: true, // Update existing contacts
      resubscribe: true // Resubscribe if unsubscribed
    };

    // Use a single list for all customers, differentiate with tags/labels
    const listId = '1'; // Ecomail list ID
    const apiUrl = `${ECOMail_API_URL}/lists/${listId}/subscribe`;
    
    logger.info('Making request to Ecomail API:', apiUrl, { prefix: 'ECOMAIL' });
    logger.info('Subscriber data:', JSON.stringify(subscriberData, null, 2), { prefix: 'ECOMAIL' });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Key': ECOMail_API_KEY
      },
      body: JSON.stringify(subscriberData)
    });

    logger.info('Ecomail API response status:', response.status, { prefix: 'ECOMAIL' });
    logger.info('Ecomail API response headers:', Object.fromEntries(response.headers.entries()), { prefix: 'ECOMAIL' });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Ecomail API error:', errorText, { prefix: 'ECOMAIL' });
      return NextResponse.json(
        { error: 'Failed to subscribe to Ecomail', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    logger.apiResponse('POST', '/api/ecomail/subscribe', 200, { success: true });
    return NextResponse.json({
      success: true,
      message: 'Customer data stored successfully',
      ecomail_response: result
    });

  } catch (error) {
    logger.error('Error storing customer data:', error, { prefix: 'ECOMAIL' });
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    }, { prefix: 'ECOMAIL' });
    logger.apiResponse('POST', '/api/ecomail/subscribe', 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
