import { NextRequest, NextResponse } from 'next/server';

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
    const customerData: CustomerData = await request.json();

    // Validate API key
    if (!ECOMail_API_KEY) {
      return NextResponse.json(
        { error: 'Ecomail API key not configured' },
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
    const label = customerData.serviceStartDate ? 'Poptávka' : 'PDF';

    // Prepare custom fields data based on the merge tags from the image
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
        value: customerData.pdfUrl || '',
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
        tags: [label] // Add label as tag to differentiate PDF vs Poptávka
      },
      trigger_autoresponders: false,
      update_existing: true, // Update existing contacts
      resubscribe: true // Resubscribe if unsubscribed
    };

    // Use a single list for all customers, differentiate with tags/labels
    const listId = '1'; // Ecomail list ID
    
    const response = await fetch(`${ECOMail_API_URL}/lists/${listId}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Key': ECOMail_API_KEY
      },
      body: JSON.stringify(subscriberData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ecomail API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to subscribe to Ecomail', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Customer data stored successfully',
      ecomail_response: result
    });

  } catch (error) {
    console.error('Error storing customer data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
