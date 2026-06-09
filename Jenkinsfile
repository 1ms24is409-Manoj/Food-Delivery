pipeline {
    agent any

    environment {
        // Docker Registry and Credentials configuration
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_CREDENTIALS_ID = 'docker-hub-credentials'

        // Image names (to be prepended with Docker Hub username on login)
        BACKEND_IMAGE = 'food-delivery-backend'
        FRONTEND_IMAGE = 'food-delivery-frontend'
        ADMIN_IMAGE = 'food-delivery-admin'

        // Tag will default to the short git commit hash, or build number as fallback
        GIT_TAG = ''

        // SonarQube configuration
        SONAR_PROJECT_KEY = 'food-delivery'
        SONAR_HOST_URL    = 'http://localhost:9000'
        JAVA_HOME         = 'C:\\Program Files\\Java\\jdk-21.0.11'
    }

    stages {
        stage('Git Version & Info') {
            steps {
                echo '=== Stage: Git Version & Info ==='
                bat 'git --version'
                script {
                    try {
                        GIT_TAG = bat(returnStdout: true, script: '@git rev-parse --short HEAD').trim()
                        echo "Target Docker image tag (Git commit hash): ${GIT_TAG}"
                    } catch (Exception e) {
                        GIT_TAG = "build-${BUILD_NUMBER}"
                        echo "Failed to get Git commit hash. Falling back to build number tag: ${GIT_TAG}"
                    }
                }
            }
        }

        stage('Dependency Check') {
            steps {
                echo '=== Stage: Dependency Check ==='
                echo 'Auditing backend dependencies...'
                dir('backend') {
                    bat 'npm audit || exit 0'
                }

                echo 'Auditing frontend dependencies...'
                dir('frontend') {
                    bat 'npm audit || exit 0'
                }

                echo 'Auditing admin dependencies...'
                dir('admin') {
                    bat 'npm audit || exit 0'
                }
            }
        }

        stage('Code Quality Check') {
            steps {
                echo '=== Stage: Code Quality Check (ESLint) ==='
                echo 'Running linting tool (ESLint) for frontend...'
                dir('frontend') {
                    bat 'npm run lint || exit 0'
                }

                echo 'Running linting tool (ESLint) for admin...'
                dir('admin') {
                    bat 'npm run lint || exit 0'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo '=== Stage: SonarQube Analysis ==='
                script {
                    // Use the SonarQube server configured in Jenkins (name: "SonarQube")
                    withSonarQubeEnv('SonarQube') {
                        def scannerHome = tool 'SonarScanner'
                        bat """
                            "${scannerHome}\\bin\\sonar-scanner.bat" ^
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} ^
                            -Dsonar.projectName="Food Delivery App" ^
                            -Dsonar.sources=. ^
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/*.test.js ^
                            -Dsonar.host.url=${SONAR_HOST_URL} ^
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo '=== Stage: Quality Gate ==='
                script {
                    // Wait for SonarQube to process and return the quality gate result
                    timeout(time: 5, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "❌ Pipeline aborted: SonarQube Quality Gate FAILED (status: ${qg.status}). Fix the code quality issues before building Docker images."
                        }
                        echo "✅ Quality Gate PASSED (status: ${qg.status}). Proceeding to Docker build."
                    }
                }
            }
        }

        stage('Containerization') {
            steps {
                echo '=== Stage: Containerization ==='
                script {
                    echo "Building Docker Image: ${BACKEND_IMAGE}:${GIT_TAG}..."
                    bat "docker build -t ${BACKEND_IMAGE}:${GIT_TAG} -f Dockerfile ."

                    echo "Building Docker Image: ${FRONTEND_IMAGE}:${GIT_TAG}..."
                    bat "docker build -t ${FRONTEND_IMAGE}:${GIT_TAG} -f frontend/Dockerfile ./frontend"

                    echo "Building Docker Image: ${ADMIN_IMAGE}:${GIT_TAG}..."
                    bat "docker build -t ${ADMIN_IMAGE}:${GIT_TAG} -f admin/Dockerfile ./admin"
                }
            }
        }

        stage('Hosting of Image in Docker Hub') {
            steps {
                echo '=== Stage: Push to Docker Hub ==='
                script {
                    try {
                        // Bind username and password from Jenkins Credentials Provider
                        withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASSWORD')]) {
                            // Securely log into Docker Registry
                            bat 'echo %DOCKER_PASSWORD%| docker login -u %DOCKER_USER% --password-stdin'

                            // Tag and Push backend
                            bat "docker tag ${BACKEND_IMAGE}:${GIT_TAG} %DOCKER_USER%/${BACKEND_IMAGE}:${GIT_TAG}"
                            bat "docker tag ${BACKEND_IMAGE}:${GIT_TAG} %DOCKER_USER%/${BACKEND_IMAGE}:latest"
                            bat "docker push %DOCKER_USER%/${BACKEND_IMAGE}:${GIT_TAG}"
                            bat "docker push %DOCKER_USER%/${BACKEND_IMAGE}:latest"

                            // Tag and Push frontend
                            bat "docker tag ${FRONTEND_IMAGE}:${GIT_TAG} %DOCKER_USER%/${FRONTEND_IMAGE}:${GIT_TAG}"
                            bat "docker tag ${FRONTEND_IMAGE}:${GIT_TAG} %DOCKER_USER%/${FRONTEND_IMAGE}:latest"
                            bat "docker push %DOCKER_USER%/${FRONTEND_IMAGE}:${GIT_TAG}"
                            bat "docker push %DOCKER_USER%/${FRONTEND_IMAGE}:latest"

                            // Tag and Push admin
                            bat "docker tag ${ADMIN_IMAGE}:${GIT_TAG} %DOCKER_USER%/${ADMIN_IMAGE}:${GIT_TAG}"
                            bat "docker tag ${ADMIN_IMAGE}:${GIT_TAG} %DOCKER_USER%/${ADMIN_IMAGE}:latest"
                            bat "docker push %DOCKER_USER%/${ADMIN_IMAGE}:${GIT_TAG}"
                            bat "docker push %DOCKER_USER%/${ADMIN_IMAGE}:latest"

                            echo "All Docker images have been successfully pushed to Docker Hub."
                        }
                    } catch (Exception e) {
                        echo "WARNING: Docker Hub push failed: ${e.getMessage()}"
                        error "Docker push stage failed. Please check credentials and connectivity."
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline has completed all execution stages.'
            cleanWs()
        }
        success {
            echo '✅ Jenkins Build succeeded!'
        }
        failure {
            echo '❌ Jenkins Build failed. Please check the logs above.'
        }
    }
}
