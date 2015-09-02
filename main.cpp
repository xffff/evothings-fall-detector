#include "mbed.h"
#include "BLEDevice.h"

BLEDevice ble;
DigitalOut led1(LED1);
DigitalOut led2(LED2);
InterruptIn button1(BUTTON1);
InterruptIn button2(BUTTON2);

uint16_t customServiceUUID  = 0xA000;
uint16_t readCharUUID       = 0xA001;
uint16_t writeCharUUID      = 0xA002;

const static char     DEVICE_NAME[]        = "Dave"; // change this
static const uint16_t uuid16_list[]        = {0xFFFF}; //Custom UUID, FFFF is reserved for development

// Set Up custom Characteristics
static uint8_t readValue[10] = {0};
ReadOnlyArrayGattCharacteristic<uint8_t, sizeof(readValue)> readChar(readCharUUID, readValue);

static uint8_t writeValue[10] = {0};
WriteOnlyArrayGattCharacteristic<uint8_t, sizeof(writeValue)> writeChar(writeCharUUID, writeValue);

// Set up custom service
GattCharacteristic *characteristics[] = {&readChar, &writeChar};
GattService        customService(customServiceUUID, characteristics, sizeof(characteristics) / sizeof(GattCharacteristic *));

Ticker ticker;

/*
 *  Restart advertising when phone app disconnects
*/ 
void disconnectionCallback(Gap::Handle_t handle, Gap::DisconnectionReason_t reason)
{
    ble.startAdvertising(); 
}

void periodicCallback()
{
    led1 = !led1; /* Do blinky on LED1 to indicate system aliveness. */
}

void periodicCallbackDouble()
{
    led1 = !led1; /* Do blinky on LED1 to indicate system aliveness. */
    led2 = !led2;
}

void allOff() {
    led1 = 0; 
    led2 = 0; 
}

void allOn() {
    led1 = 1;
    led2 = 1;
    
}

void led1On() {
    led1 = 1;
    led2 = 0;
    
}

void led2On() {
    led1 = 0;
    led2 = 1;
    
}

void slowFlash(bool isSingle) {
    wait(0.05);
    ticker.detach();
    wait(0.05);
    
    if(isSingle)
        ticker.attach(periodicCallback, 1);
    else
        ticker.attach(periodicCallbackDouble, 1);
}

void fastFlash(bool isSingle) {
    wait(0.05);
    ticker.detach();
    wait(0.05);
    
    if(isSingle)
        ticker.attach(periodicCallback, 0.05);
    else
        ticker.attach(periodicCallbackDouble, 0.05);
}

/* 
 *  handle writes to writeCharacteristic
*/
void writeCharCallback(const GattCharacteristicWriteCBParams *params)
{
    // check to see what characteristic was written, by handle
    if(params->charHandle == writeChar.getValueHandle()) {
        // should always be 1 anyway
        if(params->len == 1) {
            if(params->data[0] == 0) {        
                // off
                allOff();              
            }
            else if(params->data[0] == 1) {
                // slow flash 1
                led1On();
            }
            else if(params->data[0] == 2) {
                led2On();
            }
            else if(params->data[0] == 3) {
                allOn();
            }
            /*else if(params->data[0] == 2) {
                // slow flash both
                slowFlash(false);
            }
            else if(params->data[0] == 3) {
                // fast flash 1
                fastFlash(true);
            }
            else if(params->data[0] == 4) {
                // fast flash both
                fastFlash(false);
            }*/
        }
        
        // toggle LED1 if only 1 byte is written
        //if(params->len == 1) {
        //    led = params->data[0];
            //(params->data[0] == 0x00) ? printf("\n\rled on ") : printf("\n\rled off "); // print led toggle
        //}
        // toggle LED2 if 2 bytes ate written
        //else if(params->len == 2) {
        //    led2 = params->data[1];
        //    //(params->data[1] == 0x00) ? printf("\n\rled on ") : printf("\n\rled off "); // print led toggle
        //}

        // print the data if more than 1 byte is written
        else {
            printf("\n\r Data received: length = %d, data = 0x",params->len); 
            for(int x=0; x < params->len; x++) {
                printf("%x",params->data[x]);
            }
        }
        

        // update the readChar with the value of writeChar
        ble.updateCharacteristicValue(readChar.getValueHandle(),params->data,params->len);
    }
}

void button1PressedCallback() {
    uint8_t x[10] = {4};
    ble.updateCharacteristicValue(readChar.getValueHandle(),x,1);
}
    
void button2PressedCallback() {    
    uint8_t x[10] = {5};
    ble.updateCharacteristicValue(readChar.getValueHandle(),x,1);
}

/*
 *  main loop
*/ 
int main()
{
    button1.fall(button1PressedCallback);
    button2.fall(button2PressedCallback);
    
    for(int i = 0; i<5; i++) {
        led1On();
    
        wait(0.05);
        
        allOn();
    
        wait(0.05);
        
        led2On();
        
        wait(0.05);
        
        allOff();
        
        wait(0.05);
    }

    
    /* initialize stuff */
    printf("\n\r********* Starting Main Loop *********\n\r");
    ble.init();
    ble.onDisconnection(disconnectionCallback);
    ble.onDataWritten(writeCharCallback);
    


    /* setup advertising */
    ble.accumulateAdvertisingPayload(GapAdvertisingData::BREDR_NOT_SUPPORTED | GapAdvertisingData::LE_GENERAL_DISCOVERABLE); // BLE only, no classic BT
    ble.setAdvertisingType(GapAdvertisingParams::ADV_CONNECTABLE_UNDIRECTED); // advertising type
    ble.accumulateAdvertisingPayload(GapAdvertisingData::COMPLETE_LOCAL_NAME, (uint8_t *)DEVICE_NAME, sizeof(DEVICE_NAME)); // add name
    ble.accumulateAdvertisingPayload(GapAdvertisingData::COMPLETE_LIST_16BIT_SERVICE_IDS, (uint8_t *)uuid16_list, sizeof(uuid16_list)); // UUID's broadcast in advertising packet
    ble.setAdvertisingInterval(100); // 100ms. 

    // add our custom service
    ble.addService(customService);

    // start advertising
    ble.startAdvertising(); 
    
    // infinite loop waiting for BLE interrupt events
    while (true) {
        ble.waitForEvent(); //Save power
    }
}
