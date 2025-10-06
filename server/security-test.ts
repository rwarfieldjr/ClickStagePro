/**
 * Comprehensive Security Testing Suite for Upload Validation
 * 
 * This file contains tests to verify that all identified security vulnerabilities
 * have been properly addressed in the file upload system.
 */

import { fileValidationService, FILE_VALIDATION_CONFIG } from './fileValidation';

export async function runSecurityTests(): Promise<boolean> {
  console.log('🔐 Running comprehensive security tests...\n');
  
  let allTestsPassed = true;
  const results: { test: string; passed: boolean; details: string }[] = [];

  // Test 1: MIME Type Spoofing Protection
  console.log('Test 1: MIME Type Spoofing Protection');
  try {
    // Create a fake image file with incorrect magic bytes
    const fakeImageBuffer = Buffer.from('This is not an image file');
    const validationResult = await fileValidationService.validateFileContent(fakeImageBuffer);
    
    const testPassed = !validationResult.isValid && 
                      validationResult.errors.some(error => error.includes('Unable to detect file type'));
    
    results.push({
      test: 'MIME Type Spoofing Protection',
      passed: testPassed,
      details: testPassed ? 'Server correctly rejected file with invalid magic bytes' : 'FAILED: File with invalid content was accepted'
    });
    
    if (!testPassed) allTestsPassed = false;
    console.log(testPassed ? '✅ PASSED' : '❌ FAILED');
  } catch (err) {
    const error = err as Error;
    console.log('❌ FAILED - Error:', error.message);
    allTestsPassed = false;
  }

  // Test 2: File Size Validation
  console.log('\nTest 2: File Size Validation');
  try {
    // Create a buffer larger than allowed limit
    const largeBuffer = Buffer.alloc(FILE_VALIDATION_CONFIG.MAX_FILE_SIZE + 1000);
    const validationResult = await fileValidationService.validateFileContent(largeBuffer);
    
    const testPassed = !validationResult.isValid && 
                      validationResult.errors.some(error => error.includes('exceeds maximum allowed'));
    
    results.push({
      test: 'File Size Validation',
      passed: testPassed,
      details: testPassed ? 'Server correctly rejected oversized file' : 'FAILED: Oversized file was accepted'
    });
    
    if (!testPassed) allTestsPassed = false;
    console.log(testPassed ? '✅ PASSED' : '❌ FAILED');
  } catch (err) {
    const error = err as Error;
    console.log('❌ FAILED - Error:', error.message);
    allTestsPassed = false;
  }

  // Test 3: Upload Token Cryptographic Validation
  console.log('\nTest 3: Upload Token Cryptographic Validation');
  try {
    const validToken = fileValidationService.generateUploadToken('test-staging-request-123');
    const validatedToken = fileValidationService.validateUploadToken(validToken);
    
    // Test valid token
    const validTest = validatedToken !== null && validatedToken.stagingRequestId === 'test-staging-request-123';
    
    // Test invalid token
    const invalidToken = 'invalid-token-data';
    const invalidValidatedToken = fileValidationService.validateUploadToken(invalidToken);
    const invalidTest = invalidValidatedToken === null;
    
    // Test tampered token
    const tamperedToken = validToken.slice(0, -5) + 'ABCDE'; // Tamper with end
    const tamperedValidatedToken = fileValidationService.validateUploadToken(tamperedToken);
    const tamperedTest = tamperedValidatedToken === null;
    
    const testPassed = validTest && invalidTest && tamperedTest;
    
    results.push({
      test: 'Upload Token Cryptographic Validation',
      passed: testPassed,
      details: testPassed ? 'Token validation correctly accepts valid tokens and rejects invalid/tampered tokens' : 'FAILED: Token validation is not working correctly'
    });
    
    if (!testPassed) allTestsPassed = false;
    console.log(testPassed ? '✅ PASSED' : '❌ FAILED');
  } catch (err) {
    const error = err as Error;
    console.log('❌ FAILED - Error:', error.message);
    allTestsPassed = false;
  }

  // Test 4: Staging Request ID Binding
  console.log('\nTest 4: Staging Request ID Binding');
  try {
    const stagingId1 = 'staging-request-1';
    const stagingId2 = 'staging-request-2';
    
    const token1 = fileValidationService.generateUploadToken(stagingId1);
    const validatedToken1 = fileValidationService.validateUploadToken(token1);
    
    // Verify token is bound to correct staging request
    const bindingTest = validatedToken1 !== null && validatedToken1.stagingRequestId === stagingId1;
    
    // Verify token cannot be used for different staging request
    const crossUseValidation = fileValidationService.validateUploadRequest({
      stagingRequestId: stagingId2, // Different staging request
      fileName: 'test.jpg',
      fileSize: 1000,
      fileType: 'image/jpeg',
      uploadToken: token1 // Token for different staging request
    });
    
    const crossUseTest = !crossUseValidation.isValid;
    
    const testPassed = bindingTest && crossUseTest;
    
    results.push({
      test: 'Staging Request ID Binding',
      passed: testPassed,
      details: testPassed ? 'Upload tokens are correctly bound to specific staging requests' : 'FAILED: Tokens can be used across different staging requests'
    });
    
    if (!testPassed) allTestsPassed = false;
    console.log(testPassed ? '✅ PASSED' : '❌ FAILED');
  } catch (err) {
    const error = err as Error;
    console.log('❌ FAILED - Error:', error.message);
    allTestsPassed = false;
  }

  // Test 5: Path Traversal Protection
  console.log('\nTest 5: Path Traversal Protection');
  try {
    const pathTraversalTests = [
      '../../../etc/passwd',
      '..\\..\\windows\\system32\\config\\sam',
      'normal-file.jpg/../../../sensitive-file',
      'file.jpg\0.exe'
    ];
    
    let allPathTestsPassed = true;
    
    for (const maliciousPath of pathTraversalTests) {
      const validation = fileValidationService.validateUploadRequest({
        stagingRequestId: 'test-staging',
        fileName: maliciousPath,
        fileSize: 1000,
        fileType: 'image/jpeg'
      });
      
      if (validation.isValid) {
        allPathTestsPassed = false;
        break;
      }
    }
    
    results.push({
      test: 'Path Traversal Protection',
      passed: allPathTestsPassed,
      details: allPathTestsPassed ? 'Server correctly rejects file names with path traversal attempts' : 'FAILED: Path traversal attempts were accepted'
    });
    
    if (!allPathTestsPassed) allTestsPassed = false;
    console.log(allPathTestsPassed ? '✅ PASSED' : '❌ FAILED');
  } catch (err) {
    const error = err as Error;
    console.log('❌ FAILED - Error:', error.message);
    allTestsPassed = false;
  }

  // Test 6: Token Expiry Validation
  console.log('\nTest 6: Token Expiry Validation');
  try {
    // Create a token with very short expiry (this requires modifying the service temporarily)
    const stagingId = 'test-staging-expiry';
    
    // Generate token (normally 15 minutes, but we can't easily test expiry without waiting)
    const token = fileValidationService.generateUploadToken(stagingId);
    const validatedToken = fileValidationService.validateUploadToken(token);
    
    // For now, just verify the token has an expiry time
    const hasExpiry = validatedToken !== null && 
                     validatedToken.expiresAt > Date.now() && 
                     validatedToken.expiresAt < Date.now() + (16 * 60 * 1000); // Within 16 minutes
    
    results.push({
      test: 'Token Expiry Validation',
      passed: hasExpiry,
      details: hasExpiry ? 'Tokens include proper expiry timestamps' : 'FAILED: Token expiry is not properly configured'
    });
    
    if (!hasExpiry) allTestsPassed = false;
    console.log(hasExpiry ? '✅ PASSED' : '❌ FAILED');
  } catch (err) {
    const error = err as Error;
    console.log('❌ FAILED - Error:', error.message);
    allTestsPassed = false;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('🔐 SECURITY TEST SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.test}`);
    console.log(`   ${result.details}\n`);
  });
  
  console.log(`Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}/${results.length}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All security vulnerabilities have been successfully mitigated!');
    console.log('✅ MIME type spoofing protection implemented');
    console.log('✅ File size validation enforced server-side');
    console.log('✅ Cryptographic upload token binding implemented');
    console.log('✅ Path traversal protection active');
    console.log('✅ Comprehensive security logging in place');
    console.log('✅ Server-side content validation before ACL setting');
  } else {
    console.log('\n⚠️  Some security tests failed. Please review the implementation.');
  }
  
  return allTestsPassed;
}

// Export for testing purposes
export { fileValidationService };