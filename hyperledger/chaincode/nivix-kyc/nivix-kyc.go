package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// KYCRecord represents a KYC record
type KYCRecord struct {
	UserID           string `json:"userId"`
	SolanaAddress    string `json:"solanaAddress"`
	FullName         string `json:"fullName"`
	KYCVerified      bool   `json:"kycVerified"`
	VerificationDate string `json:"verificationDate"`
	RiskScore        int    `json:"riskScore"`
	CountryCode      string `json:"countryCode"`
}

// ComplianceRecord represents a compliance record
type ComplianceRecord struct {
	UserID      string `json:"userId"`
	Action      string `json:"action"`
	Description string `json:"description"`
	Timestamp   string `json:"timestamp"`
}

// TransactionValidation represents a transaction validation request
type TransactionValidation struct {
	TransactionID string  `json:"transactionId"`
	Amount        float64 `json:"amount"`
	Currency      string  `json:"currency"`
	Destination   string  `json:"destination"`
}

// ValidationResult represents the result of a transaction validation
type ValidationResult struct {
	IsValid bool   `json:"isValid"`
	Message string `json:"message"`
}

// TransactionRecord represents a transaction record
type TransactionRecord struct {
	TransactionID       string `json:"transactionId"`
	FromAddress         string `json:"fromAddress"`
	ToAddress           string `json:"toAddress"`
	Amount              string `json:"amount"`
	SourceCurrency      string `json:"sourceCurrency"`
	DestinationCurrency string `json:"destinationCurrency"`
	Memo                string `json:"memo"`
	Timestamp           string `json:"timestamp"`
	Status              string `json:"status"`
}

// SmartContract provides functions for managing KYC data
type SmartContract struct {
	contractapi.Contract
}

// InitLedger initializes the ledger with sample data
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("Initializing the ledger")
	return nil
}

// StoreKYC stores KYC data in the ledger
func (s *SmartContract) StoreKYC(ctx contractapi.TransactionContextInterface,
	userId string,
	solanaAddress string,
	fullName string,
	kycVerified bool,
	verificationDate string,
	riskScore int,
	countryCode string) error {

	// Create KYC record
	kycRecord := KYCRecord{
		UserID:           userId,
		SolanaAddress:    solanaAddress,
		FullName:         fullName,
		KYCVerified:      kycVerified,
		VerificationDate: verificationDate,
		RiskScore:        riskScore,
		CountryCode:      countryCode,
	}

	// Convert to JSON
	kycJSON, err := json.Marshal(kycRecord)
	if err != nil {
		return err
	}

	// Store in private data collection
	err = ctx.GetStub().PutPrivateData("kycPrivateData", userId, kycJSON)
	if err != nil {
		return fmt.Errorf("failed to put KYC data: %v", err)
	}

	// Also store a public reference that this user has KYC
	publicData := map[string]interface{}{
		"userId":        userId,
		"solanaAddress": solanaAddress,
		"kycVerified":   kycVerified,
		"riskScore":     riskScore,
		"countryCode":   countryCode,
	}
	publicJSON, err := json.Marshal(publicData)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(solanaAddress, publicJSON)
}

// GetKYCStatus quickly checks if a Solana address has KYC verification
func (s *SmartContract) GetKYCStatus(ctx contractapi.TransactionContextInterface,
	solanaAddress string) (*KYCRecord, error) {
	
	kycBytes, err := ctx.GetStub().GetState(solanaAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to read KYC status: %v", err)
	}
	if kycBytes == nil {
		return nil, fmt.Errorf("no KYC record found for address %s", solanaAddress)
	}

	var publicData map[string]interface{}
	err = json.Unmarshal(kycBytes, &publicData)
	if err != nil {
		return nil, err
	}

	// Get the private data if available
	userId, ok := publicData["userId"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid userId in public data")
	}

	privateDataBytes, err := ctx.GetStub().GetPrivateData("kycPrivateData", userId)
	if err != nil {
		// If private data fails, just return the public data
		return &KYCRecord{
			UserID:        userId,
			SolanaAddress: solanaAddress,
			KYCVerified:   publicData["kycVerified"].(bool),
			RiskScore:     int(publicData["riskScore"].(float64)),
			CountryCode:   publicData["countryCode"].(string),
		}, nil
	}

	var kycRecord KYCRecord
	err = json.Unmarshal(privateDataBytes, &kycRecord)
	if err != nil {
		return nil, err
	}

	return &kycRecord, nil
}

// UpdateKYCStatus updates the KYC verification status for a user
func (s *SmartContract) UpdateKYCStatus(ctx contractapi.TransactionContextInterface,
	userId string,
	solanaAddress string,
	kycVerified bool,
	reason string) error {

	// Get current KYC data
	kycBytes, err := ctx.GetStub().GetState(solanaAddress)
	if err != nil {
		return fmt.Errorf("failed to read KYC status: %v", err)
	}
	if kycBytes == nil {
		return fmt.Errorf("no KYC record found for address %s", solanaAddress)
	}

	var publicData map[string]interface{}
	err = json.Unmarshal(kycBytes, &publicData)
	if err != nil {
		return err
	}

	// Update public data
	publicData["kycVerified"] = kycVerified
	updatedPublicJSON, err := json.Marshal(publicData)
	if err != nil {
		return err
	}

	// Update the state
	err = ctx.GetStub().PutState(solanaAddress, updatedPublicJSON)
	if err != nil {
		return err
	}

	// Try to update private data if available
	privateDataBytes, err := ctx.GetStub().GetPrivateData("kycPrivateData", userId)
	if err == nil && privateDataBytes != nil {
		var kycRecord KYCRecord
		err = json.Unmarshal(privateDataBytes, &kycRecord)
		if err == nil {
			kycRecord.KYCVerified = kycVerified
			kycRecord.VerificationDate = time.Now().Format(time.RFC3339)
			
			updatedPrivateJSON, err := json.Marshal(kycRecord)
			if err == nil {
				_ = ctx.GetStub().PutPrivateData("kycPrivateData", userId, updatedPrivateJSON)
			}
		}
	}

	// Record compliance event
	_ = s.RecordComplianceEvent(ctx, userId, "KYC Status Update", reason)

	return nil
}

// RecordComplianceEvent records a compliance event in the private data collection
func (s *SmartContract) RecordComplianceEvent(ctx contractapi.TransactionContextInterface,
	userId string,
	action string,
	description string) error {

	complianceRecord := ComplianceRecord{
		UserID:      userId,
		Action:      action,
		Description: description,
		Timestamp:   time.Now().Format(time.RFC3339),
	}

	complianceJSON, err := json.Marshal(complianceRecord)
	if err != nil {
		return err
	}

	// Create a unique key for the compliance record
	complianceKey := fmt.Sprintf("%s_%s_%s", userId, action, time.Now().Format(time.RFC3339))

	// Store in compliance collection
	return ctx.GetStub().PutPrivateData("complianceRecords", complianceKey, complianceJSON)
}

// ValidateTransaction validates if a transaction is allowed based on KYC status and risk score
func (s *SmartContract) ValidateTransaction(ctx contractapi.TransactionContextInterface,
	solanaAddress string,
	transactionDataJSON string) (*ValidationResult, error) {

	// Parse transaction data
	var transactionData TransactionValidation
	err := json.Unmarshal([]byte(transactionDataJSON), &transactionData)
	if err != nil {
		return nil, err
	}

	// Get KYC status
	kycRecord, err := s.GetKYCStatus(ctx, solanaAddress)
	if err != nil {
		return &ValidationResult{
			IsValid: false,
			Message: "KYC record not found",
		}, nil
	}

	// Validate based on KYC status and risk score
	if !kycRecord.KYCVerified {
		return &ValidationResult{
			IsValid: false,
			Message: "KYC not verified",
		}, nil
	}

	// Check risk score
	if kycRecord.RiskScore > 70 && transactionData.Amount > 1000 {
		return &ValidationResult{
			IsValid: false,
			Message: "Transaction amount exceeds limit for high-risk user",
		}, nil
	}

	// Record the validation in compliance records
	description := fmt.Sprintf("Transaction %s validated for %f %s to %s",
		transactionData.TransactionID,
		transactionData.Amount,
		transactionData.Currency,
		transactionData.Destination)
	
	_ = s.RecordComplianceEvent(ctx, kycRecord.UserID, "Transaction Validation", description)

	return &ValidationResult{
		IsValid: true,
		Message: "Transaction validated successfully",
	}, nil
}

// QueryKYCByCountry retrieves all KYC records for a specific country
func (s *SmartContract) QueryKYCByCountry(ctx contractapi.TransactionContextInterface,
	countryCode string) ([]*KYCRecord, error) {

	// For LevelDB, we need to use GetStateByRange instead of GetQueryResult
	// We'll iterate through all KYC records and filter by country code
	
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []*KYCRecord
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var publicData map[string]interface{}
		err = json.Unmarshal(queryResult.Value, &publicData)
		if err != nil {
			continue
		}

		// Check if this record matches the requested country code
		recordCountryCode, ok := publicData["countryCode"].(string)
		if !ok || recordCountryCode != countryCode {
			continue
		}

		userId, ok := publicData["userId"].(string)
		if !ok {
			continue
		}

		solanaAddress, ok := publicData["solanaAddress"].(string)
		if !ok {
			continue
		}

		kycVerified, ok := publicData["kycVerified"].(bool)
		if !ok {
			continue
		}

		riskScore, ok := publicData["riskScore"].(float64)
		if !ok {
			continue
		}

		records = append(records, &KYCRecord{
			UserID:        userId,
			SolanaAddress: solanaAddress,
			KYCVerified:   kycVerified,
			RiskScore:     int(riskScore),
			CountryCode:   countryCode,
		})
	}

	return records, nil
}

// RecordTransaction records a transaction in the ledger
func (s *SmartContract) RecordTransaction(ctx contractapi.TransactionContextInterface,
	transactionID string,
	fromAddress string,
	toAddress string,
	amount string,
	sourceCurrency string,
	destinationCurrency string,
	memo string,
	timestamp string) error {

	// Create transaction record
	transactionRecord := TransactionRecord{
		TransactionID:       transactionID,
		FromAddress:         fromAddress,
		ToAddress:           toAddress,
		Amount:              amount,
		SourceCurrency:      sourceCurrency,
		DestinationCurrency: destinationCurrency,
		Memo:                memo,
		Timestamp:           timestamp,
		Status:              "COMPLETED",
	}

	// Convert to JSON
	transactionJSON, err := json.Marshal(transactionRecord)
	if err != nil {
		return err
	}

	// Store in the ledger
	err = ctx.GetStub().PutState("tx_"+transactionID, transactionJSON)
	if err != nil {
		return fmt.Errorf("failed to record transaction: %v", err)
	}

	// Also index by sender and recipient for faster queries
	// Index for sender
	fromAddressIndex := "from~tx~" + fromAddress + "~" + transactionID
	err = ctx.GetStub().PutState(fromAddressIndex, []byte(transactionID))
	if err != nil {
		return fmt.Errorf("failed to create from address index: %v", err)
	}

	// Index for recipient
	toAddressIndex := "to~tx~" + toAddress + "~" + transactionID
	err = ctx.GetStub().PutState(toAddressIndex, []byte(transactionID))
	if err != nil {
		return fmt.Errorf("failed to create to address index: %v", err)
	}

	return nil
}

// GetTransaction gets a transaction by ID
func (s *SmartContract) GetTransaction(ctx contractapi.TransactionContextInterface,
	transactionID string) (*TransactionRecord, error) {
	
	transactionJSON, err := ctx.GetStub().GetState("tx_" + transactionID)
	if err != nil {
		return nil, fmt.Errorf("failed to read transaction: %v", err)
	}
	if transactionJSON == nil {
		return nil, fmt.Errorf("transaction %s does not exist", transactionID)
	}

	var transaction TransactionRecord
	err = json.Unmarshal(transactionJSON, &transaction)
	if err != nil {
		return nil, err
	}

	return &transaction, nil
}

// GetTransactionsByAddress gets all transactions for an address (either sender or recipient)
func (s *SmartContract) GetTransactionsByAddress(ctx contractapi.TransactionContextInterface,
	address string) ([]*TransactionRecord, error) {
	
	// Get sender transactions
	fromResultsIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("from~tx~", []string{address})
	if err != nil {
		return nil, err
	}
	defer fromResultsIterator.Close()

	// Get recipient transactions
	toResultsIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("to~tx~", []string{address})
	if err != nil {
		return nil, err
	}
	defer toResultsIterator.Close()

	// Combine results
	transactions := []*TransactionRecord{}
	transactionIDs := make(map[string]bool)

	// Process sender transactions
	for fromResultsIterator.HasNext() {
		queryResponse, err := fromResultsIterator.Next()
		if err != nil {
			return nil, err
		}

		transactionID := string(queryResponse.Value)
		if _, exists := transactionIDs[transactionID]; !exists {
			transactionIDs[transactionID] = true
			
			transaction, err := s.GetTransaction(ctx, transactionID)
			if err == nil {
				transactions = append(transactions, transaction)
			}
		}
	}

	// Process recipient transactions
	for toResultsIterator.HasNext() {
		queryResponse, err := toResultsIterator.Next()
		if err != nil {
			return nil, err
		}

		transactionID := string(queryResponse.Value)
		if _, exists := transactionIDs[transactionID]; !exists {
			transactionIDs[transactionID] = true
			
			transaction, err := s.GetTransaction(ctx, transactionID)
			if err == nil {
				transactions = append(transactions, transaction)
			}
		}
	}

	return transactions, nil
}

// Main function starts the chaincode
func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating KYC chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting KYC chaincode: %v\n", err)
	}
} 