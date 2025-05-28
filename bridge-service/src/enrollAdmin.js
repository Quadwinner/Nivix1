const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Use the exact path to the test-network directory
        const testNetworkPath = '/media/shubham/OS/for linux work/blockchain solana/nivix-project/hyperledger/fabric-samples/test-network';
        console.log(`Using test network path: ${testNetworkPath}`);
        
        if (!fs.existsSync(testNetworkPath)) {
            console.error(`Test network path does not exist: ${testNetworkPath}`);
            process.exit(1);
        }

        // Path to connection profile
        const ccpPath = path.join(testNetworkPath, 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        console.log(`Looking for connection profile at: ${ccpPath}`);
        
        if (!fs.existsSync(ccpPath)) {
            console.error(`Connection profile not found at: ${ccpPath}`);
            process.exit(1);
        }

        // Load connection profile
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('Successfully loaded connection profile');

        // Create a new CA client for interacting with the CA
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        console.log('CA Info:', caInfo);
        
        if (!caInfo) {
            console.error('CA information not found in connection profile');
            process.exit(1);
        }
        
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
        console.log('CA client created successfully');

        // Create a new file system based wallet for managing identities
        const walletPath = path.join(process.cwd(), 'wallet');
        
        // Make sure the wallet directory exists
        if (!fs.existsSync(walletPath)) {
            fs.mkdirSync(walletPath, { recursive: true });
            console.log(`Created wallet directory at ${walletPath}`);
        }
        
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
            return;
        }

        // Enroll the admin user, and import the new identity into the wallet
        console.log('Attempting to enroll admin with credentials:', { enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        
        // Enable verbose logging
        console.log('CA URL:', caInfo.url);
        console.log('CA Name:', caInfo.caName);
        
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        console.log('Enrollment successful');
        
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        
        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user "admin" and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
        console.error(error.stack);
        process.exit(1);
    }
}

main(); 